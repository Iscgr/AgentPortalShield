
/**
 * ATOMOS PHASE 5A: Evidence Validation Routes
 * Real-time evidence collection monitoring and quality assessment
 */

import { Express } from "express";
import { EvidenceCollectionEngine } from "../services/evidence-collection-engine";

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
}
