package com.zhixing.journal.common;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(
    boolean success,
    String message,
    T data,
    String code
) {
    // 成功响应，仅返回数据
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, "操作成功", data, "200");
    }

    // 成功响应，返回数据和自定义消息
    public static <T> ApiResponse<T> success(T data, String message) {
        return new ApiResponse<>(true, message, data, "200");
    }

    // 错误响应，返回错误消息
    public static <T> ApiResponse<T> error(String message) {
        return new ApiResponse<>(false, message, null, "500");
    }

    // 错误响应，返回错误消息和自定义错误码
    public static <T> ApiResponse<T> error(String message, String code) {
        return new ApiResponse<>(false, message, null, code);
    }
}
