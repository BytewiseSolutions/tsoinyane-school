package com.tsoinyane.api.common;

import com.tsoinyane.api.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;

@Service
@RequiredArgsConstructor
public class DataFileService {

    private static final long MAX_IMAGE_BYTES = 5L * 1024L * 1024L;

    private final DataFileRepository dataFileRepository;

    @Transactional
    public DataFile storeImage(MultipartFile file, User actor) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select an image to upload.");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase().startsWith("image/")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only image files are allowed.");
        }

        if (file.getSize() > MAX_IMAGE_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image size must not exceed 5 MB.");
        }

        try {
            DataFile dataFile = DataFile.builder()
                    .name(file.getOriginalFilename())
                    .type(contentType)
                    .contents(file.getBytes())
                    .fileSize(file.getSize())
                    .createdBy(actor)
                    .updatedBy(actor)
                    .build();

            return dataFileRepository.save(dataFile);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Failed to read image file.");
        }
    }

    @Transactional(readOnly = true)
    public DataFile getFile(Long id) {
        return dataFileRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found."));
    }

    @Transactional
    public void deleteFile(Long id) {
        if (id == null) {
            return;
        }

        if (dataFileRepository.existsById(id)) {
            dataFileRepository.deleteById(id);
        }
    }
}
