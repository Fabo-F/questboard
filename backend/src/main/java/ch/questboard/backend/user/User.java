package ch.questboard.backend.user;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    @JsonIgnore
    private String passwordHash;

    @Column(nullable = false)
    private int totalXp = 0;

    @JsonIgnore
    @Basic(fetch = FetchType.LAZY)
    @Column(name = "avatar_bytes", columnDefinition = "bytea")
    private byte[] avatarBytes;

    @JsonIgnore
    private String avatarContentType;

    @Column(nullable = false)
    private boolean isAdmin = false;

    protected User() {}

    public User(String username) {
        this.username = username;
        this.totalXp = 0;
    }

    public Long getId(){ 
        return id; 
    }
    public String getUsername(){ 
        return username; 
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public int getTotalXp(){ 
        return totalXp; 
    }

    public void addXp(int amount) {
        this.totalXp += amount;
    }

    public byte[] getAvatarBytes() { 
        return avatarBytes; 
    }

    public void setAvatarBytes(byte[] avatarBytes) { 
        this.avatarBytes = avatarBytes; 
    }
    
    public String getAvatarContentType() { 
        return avatarContentType; 
    }

    public void setAvatarContentType(String avatarContentType) { 
        this.avatarContentType = avatarContentType; 
    }

    public boolean isAdmin() {
        return isAdmin;
    }

    public void setAdmin(boolean admin) {
        isAdmin = admin;
    }
}
