package ch.questboard.backend.project;

import org.springframework.web.bind.annotation.*;
import java.util.List;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/projects")
public class ProjectController {

  private final ProjectRepository projects;

  public ProjectController(ProjectRepository projects) {
    this.projects = projects;
  }

  public record CreateProjectRequest(Long userId, String title, String description) {}

  @GetMapping("/user/{userId}")
  public List<Project> byUser(@PathVariable Long userId) {
    return projects.findByUserId(userId);
  }

  @PostMapping
  public Project create(@RequestBody CreateProjectRequest req) {
    if (req.title() == null || req.title().trim().isEmpty()) {
      throw new RuntimeException("Title required");
    }
    return projects.save(new Project(req.userId(), req.title().trim(), req.description()));
  }

  @DeleteMapping("/{id}")
  public void delete(@PathVariable Long id) {
    projects.deleteById(id);
  }
}
