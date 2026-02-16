package ch.questboard.backend.project;

import ch.questboard.backend.user.User;
import jakarta.transaction.Transactional;
import ch.questboard.backend.user.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class ProjectService {
    
    private final ProjectRepository projects;
    private final UserRepository users;

    public ProjectService(ProjectRepository projects, UserRepository users){
        this.projects = projects;
        this.users = users;
    }

    @Transactional
    public Project completeProject(Long projectId){
        Project project = projects.findById(projectId).orElseThrow();
        User user = users.findById(project.getUserId()).orElseThrow();

        users.save(user);

        return projects.save(project);
    }

}
