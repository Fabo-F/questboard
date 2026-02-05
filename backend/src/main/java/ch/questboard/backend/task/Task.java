package ch.questboard.backend.task;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "tasks")
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String title;

    @Column(length = 2000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskStatus status = TaskStatus.OPEN;

    @Column(nullable = false)
    private int xp = 10;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected Task(){

    }

    public Task(Long userId, String title, String description, int xp){
        this.userId = userId;
        this.title = title;
        this.description = description;
        this.xp = xp;
        this.status = TaskStatus.OPEN;
        this.createdAt = Instant.now();
    }

    public Long getId(){
        return id;
    }

    public Long getUserId(){
        return userId;
    }

    public String getTitle(){
        return title;
    }
    public void setTitle(String title){ 
        this.title = title; 
    }

    public String getDescription(){ 
        return description; 
    }
    public void setDescription(String description){ 
        this.description = description; 
    }

    public TaskStatus getStatus(){ 
        return status; 
    }
    public void setStatus(TaskStatus status){ 
        this.status = status; 
    }

    public int getXp(){ 
        return xp; 
    }
    public void setXp(int xp){ 
        this.xp = xp; 
    }

    public Instant getCreatedAt(){ 
        return createdAt; 
    }
}
