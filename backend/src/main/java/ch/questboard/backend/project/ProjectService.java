package ch.questboard.backend.project;

import ch.questboard.backend.task.TaskRepository;
import org.springframework.stereotype.Service;

import jakarta.transaction.Transactional;

@Service
public class ProjectService {

    private final ProjectRepository projects;
    private final TaskRepository tasks;

    public ProjectService(ProjectRepository projects, TaskRepository tasks) {
        this.projects = projects;
        this.tasks = tasks;
    }

    @Transactional
    public void deleteProject(Long projectId) {
        tasks.deleteByProjectId(projectId);
        projects.deleteById(projectId);
    }
}
