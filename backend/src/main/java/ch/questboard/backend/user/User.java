package ch.questboard.backend.user;

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
    private int totalXp = 0;

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
    public int getTotalXp(){ 
        return totalXp; 
    }

    public void addXp(int amount) {
        this.totalXp += amount;
    }
}
