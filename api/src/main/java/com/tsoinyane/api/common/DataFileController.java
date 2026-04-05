package com.tsoinyane.api.common;

import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class DataFileController {

    private final DataFileService dataFileService;

    @GetMapping("/public/files/{id}")
    public ResponseEntity<byte[]> getFile(@PathVariable Long id) {
        DataFile file = dataFileService.getFile(id);
        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;

        if (file.getContentType() != null && !file.getContentType().isBlank()) {
            mediaType = MediaType.parseMediaType(file.getContentType());
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .contentLength(file.getFileSize() != null ? file.getFileSize() : 0L)
                .cacheControl(CacheControl.noCache())
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + (file.getOriginalFileName() != null ? file.getOriginalFileName() : "file") + "\"")
                .body(file.getContents());
    }
}
