package ch.questboard.backend.task;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long>{
    List<Task> findByUserId(Long userId);
    List<Task> findByProjectId(Long projectId);   

    void deleteByProjectId(Long projectId);
    long countByProjectId(Long projectId);

    @Query("""
        select t.project.id as projectId, count(t) as totalCount
        from Task t
        where t.project.id in :projectIds
        group by t.project.id
    """)
    List<TotalCountView> countTotalByProjectIds(@Param("projectIds") List<Long> projectIds);

    @Query("""
        select t.project.id as projectId, count(t) as openCount
        from Task t
        where t.project.id in :projectIds
            and t.status <> ch.questboard.backend.task.TaskStatus.DONE
        group by t.project.id
    """)
    List<OpenCountView> countOpenByProjectIds(@Param("projectIds") List<Long> projectIds);

    interface TotalCountView {
        Long getProjectId();
        Long getTotalCount();
    }

    interface OpenCountView {
        Long getProjectId();
        Long getOpenCount();
    }
}
