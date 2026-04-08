package ch.questboard.backend.project;

import org.springframework.web.bind.annotation.*;
import ch.questboard.backend.task.TaskRepository;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;


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

  public record UpdateProjectRequest(
    String title,
    String description
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
    if (req.userId() == null) {
      throw new RuntimeException("User id required");
    }

    if (req.title() == null || req.title().trim().isEmpty()) {
      throw new RuntimeException("Title required");
    }

    Project project = new Project();
    project.setUserId(req.userId());
    project.setTitle(req.title().trim());
    project.setDescription(req.description());

    Project saved = projects.save(project);

    return new ProjectDto(
        saved.getId(),
        saved.getUserId(),
        saved.getTitle(),
        saved.getDescription(),
        0,
        0
    );
  }

  @PutMapping("/{id}")
  public ProjectDto update(@PathVariable Long id, @RequestBody UpdateProjectRequest req) {
    Project project = projects.findById(id)
        .orElseThrow(() -> new RuntimeException("Project not found"));

    if (req.title() == null || req.title().trim().isEmpty()) {
      throw new RuntimeException("Title required");
    }

    project.setTitle(req.title().trim());
    project.setDescription(req.description());

    Project saved = projects.save(project);

    long totalTasks = tasks.countByProjectId(saved.getId());
    long openTasks = tasks.findByProjectId(saved.getId()).stream()
        .filter(t -> t.getStatus() != ch.questboard.backend.task.TaskStatus.DONE)
        .count();

    return new ProjectDto(
        saved.getId(),
        saved.getUserId(),
        saved.getTitle(),
        saved.getDescription(),
        openTasks,
        totalTasks
    );
  }

  @DeleteMapping("/{id}")
  public void delete(@PathVariable Long id) {
    projectService.deleteProject(id);
  }
}