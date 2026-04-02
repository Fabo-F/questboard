package ch.questboard.backend.task;

import org.springframework.web.bind.annotation.*;

import ch.questboard.backend.project.ProjectRepository;

import java.util.List;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/tasks")
public class TaskController {
    
    private final TaskRepository repo;
    private final TaskService taskService;
    private final ProjectRepository projectRepo;

    public record UpdateTaskRequest(
        @jakarta.validation.constraints.NotBlank
        String title,

        String description,

        @jakarta.validation.constraints.NotBlank
        String size,

        @jakarta.validation.constraints.Min(1)
        @jakarta.validation.constraints.Max(500)
        int xp
    ) {}

    public TaskController(TaskRepository repo, TaskService taskService, ProjectRepository projectRepo){
        this.repo = repo;
        this.taskService = taskService;
        this.projectRepo = projectRepo;
    }

    @GetMapping
    public List<Task> all() {
        return repo.findAll();
    }

    @GetMapping("/user/{userId}")
    public List<Task> byUser(@PathVariable Long userId) {
        return repo.findByUserId(userId);
    }

    @PostMapping
    public Task create(@RequestBody @jakarta.validation.Valid CreateTaskRequest req){
        var project = projectRepo.findById(req.projectId()).orElseThrow();

        Task task = new Task(
            req.userId(),
            req.title(),
            req.description(),
            req.size(),
            req.xp()
        );
        task.setProject(project);

        return repo.save(task);
    }

    @PutMapping("/{id}")
    public Task update(@PathVariable Long id, @RequestBody @jakarta.validation.Valid UpdateTaskRequest req) {
        Task task = repo.findById(id)
            .orElseThrow(() -> new RuntimeException("Task not found"));

        task.setTitle(req.title().trim());
        task.setDescription(req.description());
        task.setSize(req.size());
        task.setXp(req.xp());

        return repo.save(task);
    }
    
    public record CreateTaskRequest(
        Long userId,
        Long projectId,

        @jakarta.validation.constraints.NotBlank
        String title,

        String description,

        @jakarta.validation.constraints.NotBlank
        String size,

        @jakarta.validation.constraints.Min(1)
        @jakarta.validation.constraints.Max(500)
        int xp
    )
    {}

    @PostMapping("/{id}/complete")
    public Task complete(@PathVariable Long id) {
        return taskService.completeTask(id);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        repo.deleteById(id);
    }

    @GetMapping("/project/{projectId}")
    public List<Task> byProject(@PathVariable Long projectId) {
        return repo.findByProjectId(projectId);
    }
}
