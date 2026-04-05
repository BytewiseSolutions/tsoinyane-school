package com.tsoinyane.api.common;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "data_file")
@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true, exclude = "contents")
public class DataFile extends BaseEntity {

    private String name;
    private String type;

    @Lob
    @Column(columnDefinition = "MEDIUMBLOB")
    private byte[] contents;

    @Column(name = "file_size")
    private Long fileSize;

    public String getOriginalFileName() {
        return this.name;
    }

    public String getContentType() {
        return this.type;
    }

    public Long getFileSize() {
        if (this.fileSize == null && this.contents != null) {
            return (long) this.contents.length;
        }
        return this.fileSize;
    }
}
