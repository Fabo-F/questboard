package ch.questboard.backend.project;

import org.springframework.web.bind.annotation.*;
import ch.questboard.backend.task.TaskRepository;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;


@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/projects")
public class ProjectController {

  private final ProjectRepository projects;
  private final ProjectService projectService;
  private final TaskRepository tasks;

  public ProjectController(ProjectRepository projects, ProjectService projectService, TaskRepository tasks) {
    this.projects = projects;
    this.projectService = projectService;
    this.tasks = tasks;
  }

  public record CreateProjectRequest(
    Long userId, 
    String title, 
    String description
  ) {}

  public record ProjectDto(
    Long id,
    Long userId,
    String title,
    String description,
    long openTasks,
    long totalTasks
  ) {}

  @GetMapping("/user/{userId}")
  public List<ProjectDto> byUser(@PathVariable Long userId) {

    List<Project> ps = projects.findByUserId(userId);
    List<Long> projectIds = ps.stream().map(Project::getId).toList();

    Map<Long, Long> totalCounts = tasks.countTotalByProjectIds(projectIds).stream()
        .collect(Collectors.toMap(
            TaskRepository.TotalCountView::getProjectId,
            TaskRepository.TotalCountView::getTotalCount
        ));

    Map<Long, Long> openCounts = tasks.countOpenByProjectIds(projectIds).stream()
        .collect(Collectors.toMap(
            TaskRepository.OpenCountView::getProjectId,
            TaskRepository.OpenCountView::getOpenCount
        ));

    return ps.stream()
        .map(p -> new ProjectDto(
            p.getId(),
            p.getUserId(),
            p.getTitle(),
            p.getDescription(),
            openCounts.getOrDefault(p.getId(), 0L),
            totalCounts.getOrDefault(p.getId(), 0L)
        ))
        .toList();
  }

  @PostMapping
  public ProjectDto create(@RequestBody CreateProjectRequest req) {
    if (req.title() == null || req.title().trim().isEmpty()) {
      throw new RuntimeException("Title required");
    }

    Project saved = projects.save(
        new Project(req.userId(), req.title().trim(), req.description())
    );

    return new ProjectDto(
        saved.getId(),
        saved.getUserId(),
        saved.getTitle(),
        saved.getDescription(),
        0L, // openTasks
        0L  // totalTasks
    );
  }

  @DeleteMapping("/{id}")
  public void delete(@PathVariable Long id) {
    projectService.deleteProject(id);
  }
}