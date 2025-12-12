package com.zhixing.journal.controller;

import com.zhixing.journal.model.Review;
import com.zhixing.journal.service.ReviewService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/reviews")
@CrossOrigin(origins = "*")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @GetMapping
    public List<Review> listReviews() {
        return reviewService.getAllReviews();
    }

    @GetMapping("/{date}")
    public ResponseEntity<Review> getReview(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return reviewService.getReviewByDate(date)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Review> upsertReview(@RequestBody Review review) {
        return ResponseEntity.ok(reviewService.upsertReview(review));
    }
}
