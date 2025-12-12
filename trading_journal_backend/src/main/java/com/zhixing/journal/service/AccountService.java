package com.zhixing.journal.service;

import com.zhixing.journal.model.Account;
import com.zhixing.journal.model.User;
import com.zhixing.journal.repository.AccountRepository;
import com.zhixing.journal.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class AccountService {

    private final AccountRepository accountRepository;
    private final UserRepository userRepository;

    public AccountService(AccountRepository accountRepository, UserRepository userRepository) {
        this.accountRepository = accountRepository;
        this.userRepository = userRepository;
    }

    public List<Account> getAllAccounts() {
        return accountRepository.findAll();
    }

    public Account getAccount(Long id) {
        return accountRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Account not found"));
    }

    public Account createAccount(Account account) {
        // Ensure user exists or set default
        if (account.getUser() == null) {
            // For MVP, perform a hack to get first user or create one
            User defaultUser = userRepository.findById(1L).orElseGet(() -> {
                User u = new User();
                u.setUsername("admin");
                u.setEmail("admin@example.com");
                u.setPassword("hashed_dummy"); 
                return userRepository.save(u);
            });
            account.setUser(defaultUser);
        }
        
        if (account.getInitialBalance() == null) {
            account.setInitialBalance(account.getBalance());
        }
        
        return accountRepository.save(account);
    }

    public Account updateAccount(Long id, Account updates) {
        Account existing = getAccount(id);
        existing.setName(updates.getName());
        existing.setBroker(updates.getBroker());
        existing.setAccountNumber(updates.getAccountNumber());
        existing.setType(updates.getType());
        existing.setStatus(updates.getStatus());
        existing.setCurrency(updates.getCurrency());
        // Balance updates usually via deposits/withdrawals or trade sync, but allow manual override for now
        if (updates.getBalance() != null) {
            existing.setBalance(updates.getBalance());
        }
        if (updates.getInitialBalance() != null) {
            existing.setInitialBalance(updates.getInitialBalance());
        }
        return accountRepository.save(existing);
    }

    public void deleteAccount(Long id) {
        accountRepository.deleteById(id);
    }
}
