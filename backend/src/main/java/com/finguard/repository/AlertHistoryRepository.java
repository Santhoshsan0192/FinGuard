package com.finguard.repository;

import com.finguard.model.AlertHistory;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlertHistoryRepository extends MongoRepository<AlertHistory, String> {
    List<AlertHistory> findByAlertIdOrderByTimestampDesc(String alertId);
    void deleteByAlertId(String alertId);
}
