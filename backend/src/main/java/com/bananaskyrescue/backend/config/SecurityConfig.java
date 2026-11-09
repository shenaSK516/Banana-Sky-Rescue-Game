
package com.bananaskyrescue.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

import com.bananaskyrescue.backend.security.LoginFailureHandler;
import com.bananaskyrescue.backend.security.LoginSuccessHandler;

import jakarta.servlet.http.HttpServletResponse;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            LoginSuccessHandler loginSuccessHandler,
            LoginFailureHandler loginFailureHandler
    ) throws Exception {

        http
            .sessionManagement(session -> session
                .sessionCreationPolicy(
                    SessionCreationPolicy.IF_REQUIRED
                )
                .sessionFixation(fixation ->
                    fixation.changeSessionId()
                )
                .maximumSessions(1)
            )

            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/error").permitAll()

                .requestMatchers(
                    HttpMethod.GET,
                    "/api/auth/csrf"
                ).permitAll()

                .requestMatchers(
                    HttpMethod.POST,
                    "/api/auth/register",
                    "/api/auth/verify-email",
                    "/api/auth/resend-otp"
                ).permitAll()

                .anyRequest().authenticated()
            )
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    response.setCharacterEncoding("UTF-8");
                    response.getWriter().write(
                    "{\"message\":\"Authentication required\"}"
                    );
                })
            )
            .formLogin(form -> form
                .loginProcessingUrl("/api/auth/login")
                .usernameParameter("username")
                .passwordParameter("password")
                .successHandler(loginSuccessHandler)
                .failureHandler(loginFailureHandler)
                .permitAll()
            )

            .logout(logout -> logout
                .logoutUrl("/api/auth/logout")
                .invalidateHttpSession(true)
                .clearAuthentication(true)
                .deleteCookies("JSESSIONID")
                .logoutSuccessHandler((request, response, authentication) -> {
                    response.setStatus(HttpServletResponse.SC_OK);
                    response.setContentType("application/json");
                    response.setCharacterEncoding("UTF-8");
                    response.getWriter().write(
                        "{\"message\":\"Logout successful\"}"
                    );
                })
            );

        return http.build();
    }
}
