package dev.bankflow;

import java.util.*;
import jakarta.servlet.http.HttpServletResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.dao.*;

class ApiException extends RuntimeException {
    final int status;
    final String code;
    ApiException(int status, String code, String message) { super(message); this.status = status; this.code = code; }
    static ApiException missing() { return new ApiException(404, "NOT_FOUND", "Kayıt bulunamadı."); }
    static ApiException forbidden() { return new ApiException(403, "FORBIDDEN", "Bu işlem için yetkiniz yok."); }
    static ApiException invalid(String message) { return new ApiException(422, "VALIDATION_ERROR", message); }
    static ApiException conflict(String code, String message) { return new ApiException(409, code, message); }
}

@RestControllerAdvice
class ApiErrors {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(ApiErrors.class);
    record ErrorDto(String code, String message, Map<String, String> fieldErrors) {}
    static void write(ObjectMapper mapper, HttpServletResponse response, int status, String code, String message) throws java.io.IOException {
        response.setStatus(status); response.setContentType("application/json"); response.setCharacterEncoding("UTF-8");
        mapper.writeValue(response.getWriter(), new ErrorDto(code, message, null));
    }
    @ExceptionHandler(ApiException.class)
    ResponseEntity<ErrorDto> business(ApiException e) { return ResponseEntity.status(e.status).body(new ErrorDto(e.code, e.getMessage(), null)); }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ErrorDto> validation(MethodArgumentNotValidException e) {
        Map<String, String> fields = new LinkedHashMap<>();
        e.getBindingResult().getFieldErrors().forEach(f -> fields.putIfAbsent(f.getField(), "Geçerli bir değer girin."));
        return ResponseEntity.unprocessableEntity().body(new ErrorDto("VALIDATION_ERROR", "İstek alanlarını kontrol edin.", fields));
    }
    @ExceptionHandler({HttpMessageNotReadableException.class, MissingRequestHeaderException.class, MethodArgumentTypeMismatchException.class})
    ResponseEntity<ErrorDto> malformed(Exception e) {
        return ResponseEntity.unprocessableEntity().body(new ErrorDto("INVALID_REQUEST", "İstek biçimi veya zorunlu alan eksik.", null));
    }
    @ExceptionHandler({PessimisticLockingFailureException.class, DataIntegrityViolationException.class})
    ResponseEntity<ErrorDto> conflict(Exception e) {
        return ResponseEntity.status(409).body(new ErrorDto("CONCURRENT_CONFLICT", "İşlem çakıştı. İsteği aynı anahtarla tekrar deneyin.", null));
    }
    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    ResponseEntity<ErrorDto> notFound(Exception e) {
        return ResponseEntity.status(404).body(new ErrorDto("NOT_FOUND", "İstenen uç bulunamadı.", null));
    }
    @ExceptionHandler(org.springframework.web.HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ErrorDto> method(Exception e) {
        return ResponseEntity.status(405).body(new ErrorDto("METHOD_NOT_ALLOWED", "Bu HTTP yöntemi desteklenmiyor.", null));
    }
    @ExceptionHandler(Exception.class)
    ResponseEntity<ErrorDto> unexpected(Exception e) {
        log.error("Beklenmeyen sunucu hatası: {}", e.getClass().getName());
        return ResponseEntity.status(500).body(new ErrorDto("INTERNAL_ERROR", "İşlem tamamlanamadı.", null));
    }
}
