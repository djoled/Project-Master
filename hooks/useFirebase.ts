
import { useState, useEffect } from 'react';
import {
 collection,
 doc,
 onSnapshot,
 setDoc,
 updateDoc,
 deleteDoc,
 query,
 where,
 Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { Project, Subcategory, Task, Photo, User } from '../types';

export const useFirestoreSync = (user: any) => {
 const [projects, setProjects] = useState<Project[]>([]);
 const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
 const [tasks, setTasks] = useState<Task[]>([]);
 const [photos, setPhotos] = useState<Photo[]>([]);
 const [users, setUsers] = useState<User[]>([]);
 const [loading, setLoading] = useState(true);

 // Helper to sort by createdAt
 const sortItems = (a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0);

 useEffect(() => {
   if (!user) {
     setProjects([]);
     setSubcategories([]);
     setTasks([]);
     setPhotos([]);
     setUsers([]);
     setLoading(false);
     return;
   }

   // 1. Projects Listener (Root Collection)
   const projectsQuery = query(collection(db, 'projects'));
   const unsubscribeProjects = onSnapshot(projectsQuery, (snapshot) => {
     const fetched = snapshot.docs.map(doc => {
       const data = doc.data();
       return {
         ...data,
         id: doc.id,
         // Ensure arrays are initialized
         projectManagerIds: data.projectManagerIds || data.project_manager_ids || [],
         contractorIds: data.contractorIds || data.contractor_ids || [],
         ownerId: data.ownerId || data.owner_id,
         createdAt: data.createdAt || data.created_at,
         updatedAt: data.updatedAt || data.updated_at,
         dueDate: data.dueDate || data.due_date,
       };
     }) as Project[];
     setProjects(fetched.sort(sortItems));
   });

   // 2. Subcategories Listener (Mapped to 'departments' collection per rules)
   const subQuery = query(collection(db, 'departments'));
   const unsubscribeSub = onSnapshot(subQuery, (snapshot) => {
     const fetched = snapshot.docs.map(doc => {
         const data = doc.data();
         return {
             ...data,
             id: doc.id,
             projectId: data.projectId || data.project_id,
             createdAt: data.createdAt || data.created_at,
             createdBy: data.createdBy || data.created_by,
             dueDate: data.dueDate || data.due_date,
         };
     }) as Subcategory[];
     setSubcategories(fetched.sort(sortItems));
   });

   // 3. Tasks Listener (Root Collection)
   const tasksQuery = query(collection(db, 'tasks'));
   const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
     const fetched = snapshot.docs.map(doc => {
         const data = doc.data();
         return {
             ...data,
             id: doc.id,
             subcategoryId: data.subcategoryId || data.subcategory_id,
             createdAt: data.createdAt || data.created_at,
             createdBy: data.createdBy || data.created_by,
             dueDate: data.dueDate || data.due_date,
         };
     }) as Task[];
     setTasks(fetched.sort(sortItems));
   });
   
   // 4. Photos Listener (Root Collection)
   const photosQuery = query(collection(db, 'photos'));
   const unsubscribePhotos = onSnapshot(photosQuery, (snapshot) => {
      const fetched = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
              ...data,
              id: doc.id,
              parentId: data.parentId || data.parent_id,
              parentType: data.parentType || data.parent_type,
              uploadedBy: data.uploadedBy || data.uploaded_by,
              uploadedByName: data.uploadedByName || data.uploaded_by_name,
              createdAt: data.createdAt || data.created_at,
              imageUrl: data.imageUrl || data.image_url,
          };
      }) as Photo[];
      setPhotos(fetched.sort(sortItems));
   });

   // 5. Users Listener
   const usersQuery = query(collection(db, 'users'));
   const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
     const fetched = snapshot.docs.map(doc => {
       const data = doc.data();
       return {
         id: doc.id,
         name: data.name || 'Unknown',
         username: data.username || '',
         email: data.email || '',
         role: data.role || 'contractor',
         createdAt: data.createdAt || data.created_at || Date.now(),
       } as User;
     });
     setUsers(fetched);
   });

   setLoading(false);

   return () => {
     unsubscribeProjects();
     unsubscribeSub();
     unsubscribeTasks();
     unsubscribePhotos();
     unsubscribeUsers();
   };
 }, [user]);

 // --- CRUD Operations ---

 const addProject = async (project: Project) => {
   if (!user) return;
   await setDoc(doc(db, `projects/${project.id}`), {
     ...project,
     owner_id: project.ownerId,
     project_manager_ids: project.projectManagerIds,
     contractor_ids: project.contractorIds,
     created_at: project.createdAt,
     updated_at: project.updatedAt,
     due_date: project.dueDate
   });
 };

 const deleteProject = async (id: string) => {
   if (!user) return;
   await deleteDoc(doc(db, `projects/${id}`));
 };

 const addSubcategory = async (sub: Subcategory) => {
   if (!user) return;
   // Map to 'departments' collection
   await setDoc(doc(db, `departments/${sub.id}`), {
       ...sub,
       project_id: sub.projectId,
       created_by: sub.createdBy,
       created_at: sub.createdAt,
       due_date: sub.dueDate
   });
 };

 const addTask = async (task: Task) => {
   if (!user) return;
   await setDoc(doc(db, `tasks/${task.id}`), {
       ...task,
       subcategory_id: task.subcategoryId,
       created_by: task.createdBy,
       created_at: task.createdAt,
       due_date: task.dueDate
   });
 };
 
 const updateTask = async (task: Task) => {
    if (!user) return;
    await updateDoc(doc(db, `tasks/${task.id}`), {
        ...task,
        subcategory_id: task.subcategoryId,
        created_by: task.createdBy,
        created_at: task.createdAt,
        due_date: task.dueDate
    });
 };

 const addPhoto = async (photo: Photo) => {
    if (!user) return;
    await setDoc(doc(db, `photos/${photo.id}`), {
        ...photo,
        parent_id: photo.parentId,
        parent_type: photo.parentType,
        uploaded_by: photo.uploadedBy,
        uploaded_by_name: photo.uploadedByName,
        created_at: photo.createdAt,
        image_url: photo.imageUrl
    });
 };
 
 const updateProjectTeam = async (projectId: string, pmIds: string[], contractorIds: string[]) => {
    if(!user) return;
    await updateDoc(doc(db, `projects/${projectId}`), {
        projectManagerIds: pmIds,
        contractorIds: contractorIds,
        project_manager_ids: pmIds,
        contractor_ids: contractorIds
    });
 };

 const deleteUser = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, `users/${id}`));
 };

 return {
   projects,
   subcategories,
   tasks,
   photos,
   users,
   loading,
   addProject,
   deleteProject,
   addSubcategory,
   addTask,
   updateTask,
   addPhoto,
   updateProjectTeam,
   deleteUser
 };
};
