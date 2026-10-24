package dev.bankflow;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
class SecurityConfig {
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
    @Bean UserDetailsService userDetailsService(UserRepository users) {
        return username -> users.findByUsername(username)
            .map(u -> User.withUsername(u.username).password(u.passwordHash).roles(u.roles.split(",")).build())
            .orElseThrow(() -> new UsernameNotFoundException("Kullanıcı bulunamadı"));
    }
    @Bean SecurityFilterChain security(HttpSecurity http, ObjectMapper mapper, UserRepository users) throws Exception {
        http.authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/csrf").permitAll()
                .requestMatchers("/api/operations/**").hasRole("OPERATOR")
                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll())
            .requestCache(cache -> cache.disable())
            .formLogin(login -> login.loginProcessingUrl("/api/auth/login")
                .successHandler((request, response, authentication) -> {
                    response.setContentType("application/json"); response.setCharacterEncoding("UTF-8");
                    mapper.writeValue(response.getWriter(), Api.UserDto.of(users.findByUsername(authentication.getName()).orElseThrow()));
                })
                .failureHandler((request, response, exception) -> ApiErrors.write(mapper, response, 401, "INVALID_CREDENTIALS", "Kullanıcı adı veya parola hatalı."))
                .permitAll())
            .logout(logout -> logout.logoutUrl("/api/auth/logout")
                .logoutSuccessHandler((request, response, authentication) -> response.setStatus(204)))
            .exceptionHandling(errors -> errors
                .authenticationEntryPoint((request, response, e) -> ApiErrors.write(mapper, response, 401, "UNAUTHENTICATED", "Oturum açmanız gerekiyor."))
                .accessDeniedHandler((request, response, e) -> ApiErrors.write(mapper, response, 403, "FORBIDDEN", "Yetki veya CSRF doğrulaması başarısız.")));
        // Session CSRF protection stays enabled, including login and logout.
        return http.build();
    }
}
