
/**
 * ATOMOS PHASE 5A: Evidence Validation Routes
 * Real-time evidence collection monitoring and quality assessment
 */

import { Express } from "express";
import { EvidenceCollectionEngine } from "../services/evidence-collection-engine";
import { BayesianAnalysisEngine } from "../services/bayesian-analysis-engine";

export function registerEvidenceValidationRoutes(app: Express) {
  // ✅ ATOMOS PHASE 5A: Evidence collection status endpoint
  app.get("/api/evidence/status", async (req, res) => {
    try {
      const summary = EvidenceCollectionEngine.getCurrentSummary();
      
      res.json({
        success: true,
        phase: "5A_EVIDENCE_COLLECTION",
        evidenceStatus: summary,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Evidence status error:', error);
      res.status(500).json({ error: 'Failed to get evidence status' });
    }
  });

  // ✅ ATOMOS PHASE 5A: Evidence quality validation
  app.get("/api/evidence/quality", async (req, res) => {
    try {
      const qualityReport = EvidenceCollectionEngine.validateEvidenceQuality();
      const discriminativeReport = EvidenceCollectionEngine.validateDiscriminativePower();
      
      res.json({
        success: true,
        phase: "5A_EVIDENCE_VALIDATION",
        qualityMetrics: qualityReport,
        discriminativePower: discriminativeReport,
        timestamp: new Date().toISOString(),
        bayesianReadiness: {
          ready: qualityReport.qualityStatus !== 'INSUFFICIENT' && 
                 discriminativeReport.verificationStatus !== 'FAILED',
          confidence: Math.min(qualityReport.qualityMetrics.overallQuality, 
                               discriminativeReport.overallEffectiveness)
        }
      });
    } catch (error) {
      console.error('Evidence quality validation error:', error);
      res.status(500).json({ error: 'Failed to validate evidence quality' });
    }
  });

  // ✅ ATOMOS PHASE 5A: Manual evidence collection trigger
  app.post("/api/evidence/collect/:scenario", async (req, res) => {
    try {
      const scenario = req.params.scenario;
      const collectionId = EvidenceCollectionEngine.startCollection(scenario);
      
      // Trigger a dashboard load to collect evidence
      const dashboardResponse = await fetch(`${req.protocol}://${req.get('host')}/api/dashboard`);
      
      setTimeout(() => {
        const result = EvidenceCollectionEngine.stopCollection();
        
        res.json({
          success: true,
          phase: "5A_EVIDENCE_COLLECTION",
          collectionResult: result,
          scenario,
          timestamp: new Date().toISOString()
        });
      }, 2000); // 2 second collection window
      
    } catch (error) {
      console.error('Manual evidence collection error:', error);
      res.status(500).json({ error: 'Failed to collect evidence' });
    }
  });

  // ✅ ATOMOS PHASE 5B: Bayesian posterior probability update
  app.get("/api/evidence/bayesian-update", async (req, res) => {
    try {
      console.log(`🧮 ATOMOS PHASE 5B: Executing Bayesian posterior update`);
      
      const updates = BayesianAnalysisEngine.processPhase5AEvidence();
      const convergenceAnalysis = BayesianAnalysisEngine.analyzeConvergence(updates);
      const currentProbabilities = BayesianAnalysisEngine.getCurrentProbabilities();
      
      res.json({
        success: true,
        phase: "5B_BAYESIAN_UPDATE",
        bayesianUpdates: updates,
        convergenceAnalysis,
        currentProbabilities: Object.fromEntries(currentProbabilities),
        timestamp: new Date().toISOString(),
        protocolStatus: {
          convergenceThreshold: 0.92,
          metThreshold: convergenceAnalysis.overallConvergence >= 0.92,
          readyForPhase5C: convergenceAnalysis.convergenceStatus === 'CONVERGED'
        }
      });
    } catch (error) {
      console.error('Bayesian update error:', error);
      res.status(500).json({ error: 'Failed to perform Bayesian update' });
    }
  });

  // ✅ ATOMOS PHASE 5C: Order Sensitivity Analysis
  app.get("/api/evidence/order-sensitivity", async (req, res) => {
    try {
      console.log(`🧮 ATOMOS PHASE 5C: Executing Order Sensitivity Analysis`);
      
      const { OrderSensitivityEngine } = await import('../services/order-sensitivity-engine');
      const orderReport = OrderSensitivityEngine.executePhase5CProtocol();
      
      res.json({
        success: true,
        phase: "5C_ORDER_SENSITIVITY",
        orderSensitivityReport: orderReport,
        timestamp: new Date().toISOString(),
        protocolStatus: {
          orcThreshold: 0.85,
          metThreshold: orderReport.thresholdStatus.passed,
          readyForPhase5D: orderReport.convergenceStatus !== 'SENSITIVE',
          qualityGate: {
            name: 'ORDER_INDEPENDENCE_VERIFICATION',
            status: orderReport.thresholdStatus.passed ? 'PASSED' : 'FAILED',
            score: orderReport.orderRobustnessCoefficient
          }
        }
      });
    } catch (error) {
      console.error('Order sensitivity analysis error:', error);
      res.status(500).json({ error: 'Failed to perform order sensitivity analysis' });
    }
  });
}
