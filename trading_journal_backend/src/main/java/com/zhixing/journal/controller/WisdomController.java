package com.zhixing.journal.controller;

import com.zhixing.journal.model.Wisdom;
import com.zhixing.journal.repository.WisdomRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/wisdoms")
@CrossOrigin(origins = "*")
public class WisdomController {

    private final WisdomRepository wisdomRepository;

    public WisdomController(WisdomRepository wisdomRepository) {
        this.wisdomRepository = wisdomRepository;
    }

    @GetMapping
    public List<Wisdom> getAllWisdoms(@RequestParam(required = false) String category) {
        if (category != null && !category.isEmpty()) {
            return wisdomRepository.findByCategory(category);
        }
        return wisdomRepository.findAll();
    }

    @GetMapping("/active")
    public List<Wisdom> getActiveWisdoms() {
        return wisdomRepository.findByIsActiveTrue();
    }

    @PostMapping
    public Wisdom createWisdom(@RequestBody Wisdom wisdom) {
        return wisdomRepository.save(wisdom);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Wisdom> updateWisdom(@PathVariable Long id, @RequestBody Wisdom wisdomDetails) {
        return wisdomRepository.findById(id)
                .map(wisdom -> {
                    wisdom.setContent(wisdomDetails.getContent());
                    wisdom.setCategory(wisdomDetails.getCategory());
                    wisdom.setImportance(wisdomDetails.getImportance());
                    wisdom.setAuthor(wisdomDetails.getAuthor());
                    wisdom.setSource(wisdomDetails.getSource());
                    wisdom.setTags(wisdomDetails.getTags());
                    wisdom.setNotes(wisdomDetails.getNotes());
                    wisdom.setIsActive(wisdomDetails.getIsActive());
                    return ResponseEntity.ok(wisdomRepository.save(wisdom));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWisdom(@PathVariable Long id) {
        if (wisdomRepository.existsById(id)) {
            wisdomRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/seed")
    public List<Wisdom> seedWisdoms() {
        if (wisdomRepository.count() == 0) {
            return wisdomRepository.saveAll(List.of(
                Wisdom.builder()
                    .content("Cut your losses short and let your winners run.")
                    .category("discipline")
                    .importance(5)
                    .author("David Ricardo")
                    .tags("risk-management,basics")
                    .build(),
                Wisdom.builder()
                    .content("The trend is your friend.")
                    .category("strategy")
                    .importance(4)
                    .tags("trend-following")
                    .build(),
                Wisdom.builder()
                    .content("Markets can remain irrational longer than you can remain solvent.")
                    .category("psychology")
                    .importance(5)
                    .author("John Maynard Keynes")
                    .source("Famous Quotes")
                    .build()
            ));
        }
        return wisdomRepository.findAll();
    }
}
