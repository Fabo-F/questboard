package ch.questboard.backend.task;

import jakarta.persistence.*;
import java.time.Instant;

import ch.questboard.backend.project.Project;

@Entity
@Table(name = "tasks")
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private Long userId;

    @ManyToOne
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

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

    @Column(nullable = false)
    private String size;

    protected Task(){

    }

    public Task(Long userId, String title, String description, String size, int xp){
        this.userId = userId;
        this.title = title;
        this.description = description;
        this.size = size;
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

    public Project getProject(){
        return project;
    }

    public void setProject(Project project){
        this.project = project;
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

    public String getSize() {
        return size;
    }

    public void setSize(String size) {
        this.size = size;
    }
}
