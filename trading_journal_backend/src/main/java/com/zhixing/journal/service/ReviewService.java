package com.zhixing.journal.service;

import com.zhixing.journal.model.Review;
import com.zhixing.journal.repository.ReviewRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class ReviewService {

    private final ReviewRepository reviewRepository;

    public ReviewService(ReviewRepository reviewRepository) {
        this.reviewRepository = reviewRepository;
    }

    public List<Review> getAllReviews() {
        return reviewRepository.findAll();
    }

    public Optional<Review> getReviewByDate(LocalDate date) {
        return reviewRepository.findByDate(date);
    }

    public Review upsertReview(Review review) {
        return reviewRepository.findByDate(review.getDate())
            .map(existing -> {
                existing.setContent(review.getContent());
                existing.setMood(review.getMood());
                existing.setRating(review.getRating());
                return reviewRepository.save(existing);
            })
            .orElseGet(() -> reviewRepository.save(review));
    }
}
