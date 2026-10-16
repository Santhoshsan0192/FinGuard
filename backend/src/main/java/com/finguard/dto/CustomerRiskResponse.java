package com.finguard.dto;

import com.finguard.model.BehaviourProfile;
import com.finguard.model.Customer;
import com.finguard.model.RiskScore;

import java.util.List;

/**
 * Composite response for customer risk profile and baseline metrics.
 */
public class CustomerRiskResponse {

    private Customer customer;
    private BehaviourProfile behaviourProfile;
    private RiskScore currentRiskScore;
    private List<RiskScore> riskHistory;

    public CustomerRiskResponse() {}

    public CustomerRiskResponse(Customer customer, BehaviourProfile behaviourProfile, RiskScore currentRiskScore, List<RiskScore> riskHistory) {
        this.customer = customer;
        this.behaviourProfile = behaviourProfile;
        this.currentRiskScore = currentRiskScore;
        this.riskHistory = riskHistory;
    }

    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer customer) { this.customer = customer; }

    public BehaviourProfile getBehaviourProfile() { return behaviourProfile; }
    public void setBehaviourProfile(BehaviourProfile behaviourProfile) { this.behaviourProfile = behaviourProfile; }

    public RiskScore getCurrentRiskScore() { return currentRiskScore; }
    public void setCurrentRiskScore(RiskScore currentRiskScore) { this.currentRiskScore = currentRiskScore; }

    public List<RiskScore> getRiskHistory() { return riskHistory; }
    public void setRiskHistory(List<RiskScore> riskHistory) { this.riskHistory = riskHistory; }
}
