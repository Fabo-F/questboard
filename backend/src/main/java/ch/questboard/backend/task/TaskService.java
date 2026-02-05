package ch.questboard.backend.task;

import ch.questboard.backend.user.User;
import ch.questboard.backend.user.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

@Service
public class TaskService {
    
    private final TaskRepository tasks;
    private final UserRepository users;

    public TaskService(TaskRepository tasks, UserRepository users){
        this.tasks = tasks;
        this.users = users;
    }

    @Transactional
    public Task completeTask(Long taskId){
        Task task = tasks.findById(taskId).orElseThrow();

        if (task.getStatus() == TaskStatus.DONE){
            return task;
        }

        User user = users.findById(task.getUserId()).orElseThrow();

        task.setStatus(TaskStatus.DONE);
        user.addXp(task.getXp());

        users.save(user);

        return tasks.save(task);
    }

}
