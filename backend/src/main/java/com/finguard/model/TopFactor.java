package com.finguard.model;

/**
 * TopFactor subdocument representing an individual SHAP feature contribution.
 */
public class TopFactor {

    private String feature;
    private Double value;
    private Double shap_value;
    private String impact; // INCREASES_RISK or DECREASES_RISK
    private String description;

    public TopFactor() {}

    public String getFeature() { return feature; }
    public void setFeature(String feature) { this.feature = feature; }

    public Double getValue() { return value; }
    public void setValue(Double value) { this.value = value; }

    public Double getShap_value() { return shap_value; }
    public void setShap_value(Double shap_value) { this.shap_value = shap_value; }

    public Double getShapValue() { return shap_value; }
    public void setShapValue(Double shapValue) { this.shap_value = shapValue; }

    public String getImpact() { return impact; }
    public void setImpact(String impact) { this.impact = impact; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
