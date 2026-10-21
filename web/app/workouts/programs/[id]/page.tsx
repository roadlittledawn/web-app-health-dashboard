'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTheme, useMediaQuery } from '@mui/material';
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
  FormControl,
  IconButton,
  InputLabel,
  List,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Typography,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  ArrowBack,
  Add,
  Delete,
  Edit as EditIcon,
  PlayArrow,
  DragIndicator,
  FitnessCenter,
  ArrowUpward,
  ArrowDownward,
  UnfoldMore,
} from '@mui/icons-material';
import { PopulatedWorkoutProgram, Exercise } from '@/types/workout-programs';

export default function ProgramDetailPage() {
  const router = useRouter();
  const params = useParams();
  const programId = params.id as string;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
  const [filterExerciseType, setFilterExerciseType] = useState('');
  const [filterTargetArea, setFilterTargetArea] = useState('');
  const [filterEquipment, setFilterEquipment] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'exerciseType' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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
      setFilterExerciseType('');
      setFilterTargetArea('');
      setFilterEquipment('');
      setSortBy(null);
      fetchProgram();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSort = (column: 'name' | 'exerciseType') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const allTargetAreas = Array.from(new Set(exercises.flatMap(e => e.targetArea)));
  const allEquipment = Array.from(new Set(exercises.flatMap(e => e.requiredEquipment)));

  const filteredExercises = (() => {
    let filtered = exercises.filter(e =>
      e.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filterExerciseType) filtered = filtered.filter(e => e.exerciseType === filterExerciseType);
    if (filterTargetArea) filtered = filtered.filter(e => e.targetArea.includes(filterTargetArea));
    if (filterEquipment) filtered = filtered.filter(e => e.requiredEquipment.includes(filterEquipment));
    if (sortBy) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortBy] ?? '';
        const bVal = b[sortBy] ?? '';
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          const cmp = aVal.localeCompare(bVal);
          return sortOrder === 'asc' ? cmp : -cmp;
        }
        return 0;
      });
    }
    return filtered;
  })();

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

      <Dialog open={addExerciseDialogOpen} onClose={() => setAddExerciseDialogOpen(false)} maxWidth="lg" fullWidth fullScreen={isMobile}>
        <DialogTitle>Add Exercise</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, mt: 1, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
            <TextField
              label="Search by name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ flex: 1 }}
              size={isMobile ? 'small' : 'medium'}
            />
            <FormControl sx={{ minWidth: { sm: 150 } }} size={isMobile ? 'small' : 'medium'}>
              <InputLabel>Type</InputLabel>
              <Select value={filterExerciseType} label="Type" onChange={(e) => setFilterExerciseType(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="strength">Strength</MenuItem>
                <MenuItem value="flexibility">Flexibility</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: { sm: 150 } }} size={isMobile ? 'small' : 'medium'}>
              <InputLabel>Target Area</InputLabel>
              <Select value={filterTargetArea} label="Target Area" onChange={(e) => setFilterTargetArea(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                {allTargetAreas.map(area => (
                  <MenuItem key={area} value={area}>{area}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: { sm: 150 }, display: { xs: 'none', sm: 'flex' } }} size={isMobile ? 'small' : 'medium'}>
              <InputLabel>Equipment</InputLabel>
              <Select value={filterEquipment} label="Equipment" onChange={(e) => setFilterEquipment(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                {allEquipment.map(eq => (
                  <MenuItem key={eq} value={eq}>{eq}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Showing {filteredExercises.length} of {exercises.length} exercises
          </Typography>
          <TableContainer component={Paper} sx={{ maxHeight: isMobile ? 'calc(100vh - 280px)' : 400 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell onClick={() => handleSort('name')} sx={{ cursor: 'pointer', userSelect: 'none' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      Name
                      {sortBy === 'name' ? (sortOrder === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />) : <UnfoldMore fontSize="small" sx={{ opacity: 0.3 }} />}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }} onClick={() => handleSort('exerciseType')} >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', userSelect: 'none' }}>
                      Category
                      {sortBy === 'exerciseType' ? (sortOrder === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />) : <UnfoldMore fontSize="small" sx={{ opacity: 0.3 }} />}
                    </Box>
                  </TableCell>
                  <TableCell>Target Areas</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Equipment</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredExercises.map((exercise) => (
                  <TableRow key={exercise._id?.toString()} hover>
                    <TableCell>
                      {exercise.name}
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      {exercise.exerciseType ? (
                        <Chip label={exercise.exerciseType} size="small" color={exercise.exerciseType === 'strength' ? 'primary' : 'secondary'} />
                      ) : '-'}
                    </TableCell>
                    <TableCell>{exercise.targetArea.join(', ')}</TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{exercise.requiredEquipment.length > 0 ? exercise.requiredEquipment.join(', ') : '-'}</TableCell>
                    <TableCell align="right">
                      {isMobile ? (
                        <IconButton size="small" color="primary" onClick={() => handleAddExercise(exercise)}>
                          <Add />
                        </IconButton>
                      ) : (
                        <Button size="small" variant="outlined" startIcon={<Add />} onClick={() => handleAddExercise(exercise)}>
                          Add
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddExerciseDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
