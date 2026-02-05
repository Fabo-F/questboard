package ch.questboard.backend.user;

import ch.questboard.backend.task.Task;
import java.util.List;

public record UserDashboardResponse(
    Long id,
    String username,
    int totalXp,
    int openTasks,
    int doneTasks,
    List<Task> tasks
)
{}
