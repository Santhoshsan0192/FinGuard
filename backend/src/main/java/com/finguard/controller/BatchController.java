package com.finguard.controller;

import com.finguard.model.Batch;
import com.finguard.service.BatchService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/batches")
public class BatchController {

    private final BatchService batchService;

    public BatchController(BatchService batchService) {
        this.batchService = batchService;
    }

    @GetMapping
    public ResponseEntity<List<Batch>> getAllBatches() {
        return ResponseEntity.ok(batchService.getAllBatches());
    }

    @GetMapping("/latest")
    public ResponseEntity<Batch> getLatestBatch() {
        return batchService.getLatestBatch()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{batchId}")
    public ResponseEntity<Batch> getBatchById(@PathVariable String batchId) {
        return ResponseEntity.ok(batchService.getBatchById(batchId));
    }
}
