'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  List,
  TextField,
  Toolbar,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Grid,
} from '@mui/material';
import {
  ArrowBack,
  Add,
  Delete,
  Edit as EditIcon,
  PlayArrow,
  DragIndicator,
  FitnessCenter,
} from '@mui/icons-material';
import { PopulatedWorkoutProgram, Exercise } from '@/types/workout-programs';

export default function ProgramDetailPage() {
  const router = useRouter();
  const params = useParams();
  const programId = params.id as string;

  const [program, setProgram] = useState<PopulatedWorkoutProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addExerciseDialogOpen, setAddExerciseDialogOpen] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingExerciseIndex, setEditingExerciseIndex] = useState<number | null>(null);
  const [exerciseConfig, setExerciseConfig] = useState({ sets: 3, reps: 10, duration_seconds: 60, notes: '' });
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchProgram();
    fetchExercises();
  }, [programId]);

  const fetchProgram = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/workout-programs?id=${programId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch program');

      const data = await response.json();
      setProgram(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchExercises = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/exercises', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch exercises');

      const data = await response.json();
      setExercises(data.data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddExercise = async (exercise: Exercise) => {
    if (!program) return;

    try {
      const token = localStorage.getItem('auth-token');
      const newExercise = {
        exercise_id: exercise._id,
        order: program.exercises.length,
        sets: exercise.isTimeBased ? undefined : exerciseConfig.sets,
        reps: exercise.isTimeBased ? undefined : exerciseConfig.reps,
        duration_seconds: exercise.isTimeBased ? exerciseConfig.duration_seconds : undefined,
      };

      const updatedExercises = [...program.exercises.map(e => ({
        exercise_id: e.exercise_id,
        order: e.order,
        sets: e.sets,
        reps: e.reps,
        duration_seconds: e.duration_seconds,
        notes: e.notes,
      })), newExercise];

      const response = await fetch('/api/workout-programs', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: programId, updates: { exercises: updatedExercises } }),
      });

      if (!response.ok) throw new Error('Failed to add exercise');

      setAddExerciseDialogOpen(false);
      setSearchTerm('');
      fetchProgram();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemoveExercise = async (index: number) => {
    if (!program) return;

    try {
      const token = localStorage.getItem('auth-token');
      const updatedExercises = program.exercises
        .filter((_, i) => i !== index)
        .map((e, i) => ({
          exercise_id: e.exercise_id,
          order: i,
          sets: e.sets,
          reps: e.reps,
          duration_seconds: e.duration_seconds,
          notes: e.notes,
        }));

      const response = await fetch('/api/workout-programs', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: programId, updates: { exercises: updatedExercises } }),
      });

      if (!response.ok) throw new Error('Failed to remove exercise');

      fetchProgram();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openEditDialog = (index: number) => {
    if (!program) return;
    const pe = program.exercises[index];
    setEditingExerciseIndex(index);
    setExerciseConfig({
      sets: pe.sets || 3,
      reps: pe.reps || 10,
      duration_seconds: pe.duration_seconds || 60,
      notes: pe.notes || '',
    });
    setEditDialogOpen(true);
  };

  const handleUpdateExerciseConfig = async () => {
    if (!program || editingExerciseIndex === null) return;

    try {
      const token = localStorage.getItem('auth-token');
      const updatedExercises = program.exercises.map((e, i) => ({
        exercise_id: e.exercise_id,
        order: e.order,
        sets: i === editingExerciseIndex ? exerciseConfig.sets : e.sets,
        reps: i === editingExerciseIndex ? exerciseConfig.reps : e.reps,
        duration_seconds: i === editingExerciseIndex ? exerciseConfig.duration_seconds : e.duration_seconds,
        notes: i === editingExerciseIndex ? exerciseConfig.notes || undefined : e.notes,
      }));

      const response = await fetch('/api/workout-programs', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: programId, updates: { exercises: updatedExercises } }),
      });

      if (!response.ok) throw new Error('Failed to update exercise');

      setEditDialogOpen(false);
      setEditingExerciseIndex(null);
      fetchProgram();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    if (draggedIndex === null || draggedIndex === dropIndex || !program) return;

    try {
      const token = localStorage.getItem('auth-token');
      const reorderedExercises = [...program.exercises];
      const [draggedItem] = reorderedExercises.splice(draggedIndex, 1);
      reorderedExercises.splice(dropIndex, 0, draggedItem);

      const updatedExercises = reorderedExercises.map((e, i) => ({
        exercise_id: e.exercise_id,
        order: i,
        sets: e.sets,
        reps: e.reps,
        duration_seconds: e.duration_seconds,
        notes: e.notes,
      }));

      const response = await fetch('/api/workout-programs', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: programId, updates: { exercises: updatedExercises } }),
      });

      if (!response.ok) throw new Error('Failed to reorder exercises');

      setDraggedIndex(null);
      fetchProgram();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredExercises = exercises.filter(e =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!program) {
    return (
      <Container>
        <Alert severity="error">Program not found</Alert>
      </Container>
    );
  }

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => router.push('/workouts/programs')}>
            <ArrowBack />
          </IconButton>
          <FitnessCenter sx={{ mr: 2 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {program.name}
          </Typography>
          <Button 
            color="inherit" 
            startIcon={<PlayArrow />}
            onClick={() => router.push(`/workouts/session/${programId}`)}
          >
            Start Workout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              {program.name}
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              {program.description || 'No description'}
            </Typography>
            <Chip label={`${program.exercises.length} exercises`} />
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Exercises</Typography>
          <Button startIcon={<Add />} variant="contained" onClick={() => setAddExerciseDialogOpen(true)}>
            Add Exercise
          </Button>
        </Box>

        <List>
          {program.exercises.map((pe, index) => (
            <Card 
              key={index} 
              sx={{ 
                mb: 2, 
                cursor: 'move',
                opacity: draggedIndex === index ? 0.5 : 1,
                border: dragOverIndex === index && draggedIndex !== index ? '2px solid' : '1px solid',
                borderColor: dragOverIndex === index && draggedIndex !== index ? 'primary.main' : 'divider',
                transition: 'all 0.2s',
                '&:hover': { boxShadow: 3 }
              }}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <DragIndicator color="action" sx={{ cursor: 'grab' }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6">{pe.exercise.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {pe.exercise.targetArea.join(', ')}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Chip
                        label={
                          pe.exercise.isTimeBased
                            ? `${pe.duration_seconds}s`
                            : `${pe.sets} sets × ${pe.reps} reps`
                        }
                        size="small"
                      />
                    </Box>
                    {pe.notes && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {pe.notes}
                      </Typography>
                    )}
                  </Box>
                  <IconButton onClick={() => openEditDialog(index)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleRemoveExercise(index)}>
                    <Delete />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          ))}
        </List>

        {program.exercises.length === 0 && (
          <Box textAlign="center" py={4}>
            <Typography color="text.secondary">
              No exercises in this program. Add exercises to get started!
            </Typography>
          </Box>
        )}
      </Container>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Edit Exercise
        </DialogTitle>
        <DialogContent>
          {editingExerciseIndex !== null && program.exercises[editingExerciseIndex] && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              {!program.exercises[editingExerciseIndex].exercise.isTimeBased ? (
                <>
                  <TextField
                    label="Sets"
                    type="number"
                    value={exerciseConfig.sets}
                    onChange={(e) => setExerciseConfig({ ...exerciseConfig, sets: parseInt(e.target.value) || 0 })}
                    fullWidth
                  />
                  <TextField
                    label="Reps"
                    type="number"
                    value={exerciseConfig.reps}
                    onChange={(e) => setExerciseConfig({ ...exerciseConfig, reps: parseInt(e.target.value) || 0 })}
                    fullWidth
                  />
                </>
              ) : (
                <TextField
                  label="Duration (seconds)"
                  type="number"
                  value={exerciseConfig.duration_seconds}
                  onChange={(e) => setExerciseConfig({ ...exerciseConfig, duration_seconds: parseInt(e.target.value) || 0 })}
                  fullWidth
                />
              )}
              <TextField
                label="Notes"
                value={exerciseConfig.notes}
                onChange={(e) => setExerciseConfig({ ...exerciseConfig, notes: e.target.value })}
                multiline
                rows={3}
                fullWidth
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateExerciseConfig}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={addExerciseDialogOpen} onClose={() => setAddExerciseDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add Exercise</DialogTitle>
        <DialogContent>
          <TextField
            label="Search exercises"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            fullWidth
            sx={{ mb: 2, mt: 1 }}
          />
          <Grid container spacing={2}>
            {filteredExercises.map((exercise) => (
              <Grid item xs={12} sm={6} key={exercise._id?.toString()}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">{exercise.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {exercise.targetArea.join(', ')}
                    </Typography>
                    <Chip label={exercise.difficulty} size="small" sx={{ mt: 1 }} />
                  </CardContent>
                  <Box sx={{ p: 2, pt: 0 }}>
                    <Button size="small" onClick={() => handleAddExercise(exercise)}>
                      Add
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddExerciseDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
