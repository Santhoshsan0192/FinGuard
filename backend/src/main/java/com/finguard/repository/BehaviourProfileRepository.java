package com.finguard.repository;

import com.finguard.model.BehaviourProfile;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BehaviourProfileRepository extends MongoRepository<BehaviourProfile, String> {
    Optional<BehaviourProfile> findByCustomerId(String customerId);
}
