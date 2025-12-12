package com.zhixing.journal.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class SpaController {

    // Forward known frontend routes to index.html
    // Note: We avoid "/**" to prevent overriding static resources or API calls unexpectedly.
    // Instead we map top-level routes used by the Next.js app.
    
    @RequestMapping(value = {
        "/", 
        "/stock-selection", 
        "/stock/**", 
        "/strategies",
        "/strategies/**",
        "/sectors",
        "/journal",
        "/settings",
        "/trade-review",
        "/login", 
        "/register"
    })
    public String forward() {
        return "forward:/index.html";
    }
}
