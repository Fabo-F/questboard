package ch.questboard.backend.task;

import org.springframework.web.bind.annotation.*;
import java.util.List;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/tasks")
public class TaskController {
    
    private final TaskRepository repo;

    private final TaskService taskService;

    public TaskController(TaskRepository repo, TaskService taskService){
        this.repo = repo;
        this.taskService = taskService;
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
        Task task = new Task(req.userId(), req.title(), req.description(), req.xp());
        return repo.save(task);
    }
    
    public record CreateTaskRequest(
        Long userId,
        
        @jakarta.validation.constraints.NotBlank
        String title,
        
        String description, 
        
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
}
