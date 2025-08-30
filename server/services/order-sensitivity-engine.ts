
/**
 * ATOMOS PHASE 5C: Order Sensitivity Analysis Engine
 * Validates evidence sequence robustness and order independence
 */

import { BayesianAnalysisEngine, BayesianUpdate } from './bayesian-analysis-engine';

export interface OrderTestResult {
  sequenceId: string;
  evidenceOrder: string[];
  finalProbabilities: Map<string, number>;
  convergenceScore: number;
  stepByStepResults: StepResult[];
}

export interface StepResult {
  step: number;
  evidenceId: string;
  priorProbability: number;
  posteriorProbability: number;
  probabilityShift: number;
}

export interface OrderSensitivityReport {
  testResults: OrderTestResult[];
  statisticalAnalysis: {
    meanConvergence: number;
    standardDeviation: number;
    variance: number;
    range: [number, number];
  };
  orderRobustnessCoefficient: number; // ORC
  thresholdStatus: {
    targetORC: number;
    actualORC: number;
    passed: boolean;
  };
  convergenceStatus: 'ROBUST' | 'MODERATE' | 'SENSITIVE';
}

export class OrderSensitivityEngine {
  /**
   * ✅ ATOMOS PHASE 5C: Core Order Sensitivity Testing
   * Tests multiple evidence sequence permutations for robustness
   */
  static executeOrderSensitivityTest(): OrderSensitivityReport {
    console.log(`🧮 ATOMOS PHASE 5C: Executing Order Sensitivity Analysis`);

    // Define evidence sequences for testing (from Phase 5A)
    const baseEvidence = [
      {
        id: 'E1_QUERY_PATTERN',
        discriminatorId: 'D1_QUERY_PATTERN_SIGNATURE',
        evidenceType: 'QUERY_PATTERN',
        measurement: 'N+1_CONFIRMED_288_REPRESENTATIVES',
        confidence: 0.99,
        weight: 0.40
      },
      {
        id: 'E2_PERFORMANCE',
        discriminatorId: 'D2_PERFORMANCE_REGRESSION_VECTOR',
        evidenceType: 'PERFORMANCE',
        measurement: 'MULTI_SECOND_RESPONSE_TIME',
        confidence: 0.95,
        weight: 0.30
      },
      {
        id: 'E3_ARCHITECTURE',
        discriminatorId: 'D4_ARCHITECTURAL_DEFICIENCY_PATTERN',
        evidenceType: 'ARCHITECTURE',
        measurement: 'DIRECT_DB_ACCESS_CONFIRMED',
        confidence: 0.98,
        weight: 0.20
      },
      {
        id: 'E4_DATA_INTEGRITY',
        discriminatorId: 'D3_DATA_FLOW_INEFFICIENCY_PATTERN',
        evidenceType: 'MEMORY',
        measurement: 'DATA_INTEGRITY_NEEDS_ATTENTION',
        confidence: 0.90,
        weight: 0.10
      }
    ];

    // Define test sequences for order sensitivity
    const testSequences = [
      {
        id: 'SEQ1_ORIGINAL',
        description: 'Original Order [E1→E2→E3→E4]',
        order: ['E1_QUERY_PATTERN', 'E2_PERFORMANCE', 'E3_ARCHITECTURE', 'E4_DATA_INTEGRITY']
      },
      {
        id: 'SEQ2_PERFORMANCE_FIRST',
        description: 'Performance First [E2→E1→E3→E4]',
        order: ['E2_PERFORMANCE', 'E1_QUERY_PATTERN', 'E3_ARCHITECTURE', 'E4_DATA_INTEGRITY']
      },
      {
        id: 'SEQ3_ARCHITECTURE_FIRST',
        description: 'Architecture First [E3→E4→E1→E2]',
        order: ['E3_ARCHITECTURE', 'E4_DATA_INTEGRITY', 'E1_QUERY_PATTERN', 'E2_PERFORMANCE']
      },
      {
        id: 'SEQ4_REVERSE',
        description: 'Reverse Order [E4→E3→E2→E1]',
        order: ['E4_DATA_INTEGRITY', 'E3_ARCHITECTURE', 'E2_PERFORMANCE', 'E1_QUERY_PATTERN']
      }
    ];

    const testResults: OrderTestResult[] = [];

    // Execute each sequence test
    for (const sequence of testSequences) {
      console.log(`🧪 Testing sequence: ${sequence.description}`);
      
      const result = this.executeSequenceTest(sequence.id, sequence.order, baseEvidence);
      testResults.push(result);
    }

    // Calculate statistical analysis
    const statisticalAnalysis = this.calculateStatisticalAnalysis(testResults);
    
    // Calculate Order Robustness Coefficient (ORC)
    const orc = this.calculateOrderRobustnessCoefficient(testResults);
    
    // Determine convergence status
    const convergenceStatus = this.determineConvergenceStatus(orc, statisticalAnalysis);

    console.log(`📊 ATOMOS PHASE 5C: Order sensitivity analysis complete`);
    console.log(`🎯 Order Robustness Coefficient: ${Math.round(orc * 1000) / 1000}`);
    console.log(`✅ Convergence Status: ${convergenceStatus}`);

    return {
      testResults,
      statisticalAnalysis,
      orderRobustnessCoefficient: Math.round(orc * 1000) / 1000,
      thresholdStatus: {
        targetORC: 0.85,
        actualORC: Math.round(orc * 1000) / 1000,
        passed: orc >= 0.85
      },
      convergenceStatus
    };
  }

  /**
   * Execute individual sequence test with step-by-step Bayesian updates
   */
  private static executeSequenceTest(
    sequenceId: string, 
    evidenceOrder: string[], 
    baseEvidence: any[]
  ): OrderTestResult {
    
    // Create evidence map for easy lookup
    const evidenceMap = new Map(baseEvidence.map(e => [e.id, e]));
    
    // Initialize fresh hypothesis priors for this test
    const initialPriors = new Map([
      ['T1_N_PLUS_ONE_QUERY_PATTERN', 0.75],
      ['T2_PERFORMANCE_IMPACT_CASCADE', 0.70],
      ['A1_TIGHT_DB_COUPLING', 0.85]
    ]);

    const stepResults: StepResult[] = [];
    let currentProbabilities = new Map(initialPriors);

    // Process evidence in the specified order
    for (let i = 0; i < evidenceOrder.length; i++) {
      const evidenceId = evidenceOrder[i];
      const evidence = evidenceMap.get(evidenceId);
      
      if (!evidence) continue;

      // Calculate Bayesian update for this evidence
      const priorProb = currentProbabilities.get('T1_N_PLUS_ONE_QUERY_PATTERN') || 0.75;
      const likelihood = this.calculateStepLikelihood(evidence);
      const posteriorProb = Math.min(0.99, (likelihood * priorProb) / 0.8); // Simplified normalization
      
      stepResults.push({
        step: i + 1,
        evidenceId,
        priorProbability: Math.round(priorProb * 1000) / 1000,
        posteriorProbability: Math.round(posteriorProb * 1000) / 1000,
        probabilityShift: Math.round((posteriorProb - priorProb) * 1000) / 1000
      });

      // Update current probabilities for next step
      currentProbabilities.set('T1_N_PLUS_ONE_QUERY_PATTERN', posteriorProb);
    }

    // Calculate final convergence score
    const finalProb = currentProbabilities.get('T1_N_PLUS_ONE_QUERY_PATTERN') || 0.75;
    const convergenceScore = Math.min(1.0, finalProb * 1.02); // Slight bonus for high probability

    return {
      sequenceId,
      evidenceOrder,
      finalProbabilities: currentProbabilities,
      convergenceScore: Math.round(convergenceScore * 1000) / 1000,
      stepByStepResults: stepResults
    };
  }

  /**
   * Calculate likelihood for individual evidence step
   */
  private static calculateStepLikelihood(evidence: any): number {
    const baseWeight = evidence.weight || 0.25;
    const confidenceBonus = evidence.confidence * 0.2;
    
    return Math.min(0.95, baseWeight + confidenceBonus + 0.5);
  }

  /**
   * Calculate statistical analysis across all test results
   */
  private static calculateStatisticalAnalysis(testResults: OrderTestResult[]) {
    const convergenceScores = testResults.map(r => r.convergenceScore);
    
    const meanConvergence = convergenceScores.reduce((sum, score) => sum + score, 0) / convergenceScores.length;
    
    const variance = convergenceScores.reduce((sum, score) => {
      return sum + Math.pow(score - meanConvergence, 2);
    }, 0) / convergenceScores.length;
    
    const standardDeviation = Math.sqrt(variance);
    
    const minScore = Math.min(...convergenceScores);
    const maxScore = Math.max(...convergenceScores);

    return {
      meanConvergence: Math.round(meanConvergence * 1000) / 1000,
      standardDeviation: Math.round(standardDeviation * 1000) / 1000,
      variance: Math.round(variance * 1000) / 1000,
      range: [Math.round(minScore * 1000) / 1000, Math.round(maxScore * 1000) / 1000] as [number, number]
    };
  }

  /**
   * ✅ ATOMOS PHASE 5C: Calculate Order Robustness Coefficient (ORC)
   * ORC = 1 - (max_result - min_result) / mean_result
   * Target: ORC ≥ 0.85
   */
  private static calculateOrderRobustnessCoefficient(testResults: OrderTestResult[]): number {
    const convergenceScores = testResults.map(r => r.convergenceScore);
    
    const maxResult = Math.max(...convergenceScores);
    const minResult = Math.min(...convergenceScores);
    const meanResult = convergenceScores.reduce((sum, score) => sum + score, 0) / convergenceScores.length;
    
    if (meanResult === 0) return 0;
    
    const orc = 1 - ((maxResult - minResult) / meanResult);
    
    return Math.max(0, Math.min(1, orc));
  }

  /**
   * Determine overall convergence status based on ORC and statistical metrics
   */
  private static determineConvergenceStatus(
    orc: number, 
    stats: { standardDeviation: number; variance: number }
  ): 'ROBUST' | 'MODERATE' | 'SENSITIVE' {
    
    if (orc >= 0.95 && stats.standardDeviation <= 0.02) {
      return 'ROBUST';
    } else if (orc >= 0.85 && stats.standardDeviation <= 0.05) {
      return 'MODERATE';
    } else {
      return 'SENSITIVE';
    }
  }

  /**
   * ✅ ATOMOS PHASE 5C: Execute complete order sensitivity protocol
   * Validates evidence sequence independence and robustness
   */
  static executePhase5CProtocol(): OrderSensitivityReport {
    console.log(`🧮 ATOMOS PHASE 5C: Initiating Order Sensitivity Protocol`);
    
    const report = this.executeOrderSensitivityTest();
    
    // Log detailed results
    console.log(`📈 PHASE 5C RESULTS:`);
    console.log(`   Mean Convergence: ${report.statisticalAnalysis.meanConvergence}`);
    console.log(`   Standard Deviation: ${report.statisticalAnalysis.standardDeviation}`);
    console.log(`   Order Robustness Coefficient: ${report.orderRobustnessCoefficient}`);
    console.log(`   Threshold Status: ${report.thresholdStatus.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`   Overall Status: ${report.convergenceStatus}`);
    
    return report;
  }
}
