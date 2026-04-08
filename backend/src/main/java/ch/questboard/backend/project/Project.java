package ch.questboard.backend.project;

import jakarta.persistence.*;

@Entity
@Table(name = "projects")
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String title;
    
    @Column(length = 2000)
    private String description;

    protected Project() {}

    public Project(Long userId, String title, String description){
        this.userId = userId;
        this.title = title;
        this.description = description;
    }

    public Long getId(){
        return id;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
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
}
