
package com.bananaskyrescue.backend.service;

import org.springframework.stereotype.Service;

import jakarta.servlet.http.HttpServletRequest;

@Service
public class ClientIdentificationService {

    public String getClientKey(HttpServletRequest request) {

        if (request == null) {
            return null;
        }

        String remoteAddress = request.getRemoteAddr();

        if (remoteAddress == null || remoteAddress.isBlank()) {
            return null;
        }

        return remoteAddress;
    }
}
