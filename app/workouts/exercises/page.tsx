'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Toolbar,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import {
  ArrowBack,
  Add,
  Edit,
  Delete,
  FitnessCenter,
} from '@mui/icons-material';
import { Exercise } from '@/types/workout-programs';

export default function ExercisesPage() {
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchName, setSearchName] = useState('');
  const [filterTargetArea, setFilterTargetArea] = useState('');
  const [filterEquipment, setFilterEquipment] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    aliases: '',
    targetArea: '',
    requiredEquipment: '',
    description: '',
    difficulty: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    isTimeBased: false,
    mediaUrl: '',
  });

  useEffect(() => {
    fetchExercises();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [exercises, searchName, filterTargetArea, filterEquipment]);

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
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = exercises;

    if (searchName) {
      filtered = filtered.filter(e => 
        e.name.toLowerCase().includes(searchName.toLowerCase())
      );
    }

    if (filterTargetArea) {
      filtered = filtered.filter(e => e.targetArea.includes(filterTargetArea));
    }

    if (filterEquipment) {
      filtered = filtered.filter(e => e.requiredEquipment.includes(filterEquipment));
    }

    setFilteredExercises(filtered);
  };

  const handleCreateExercise = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const payload = {
        name: formData.name,
        aliases: formData.aliases.split(',').map(a => a.trim()).filter(Boolean),
        targetArea: formData.targetArea.split(',').map(a => a.trim()).filter(Boolean),
        requiredEquipment: formData.requiredEquipment.split(',').map(e => e.trim()).filter(Boolean),
        description: formData.description,
        difficulty: formData.difficulty,
        isTimeBased: formData.isTimeBased,
        media: formData.mediaUrl ? [{ type: 'youtube', url: formData.mediaUrl }] : [],
      };

      const response = await fetch('/api/exercises', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to create exercise');

      setCreateDialogOpen(false);
      resetForm();
      fetchExercises();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEditClick = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setFormData({
      name: exercise.name,
      aliases: exercise.aliases.join(', '),
      targetArea: exercise.targetArea.join(', '),
      requiredEquipment: exercise.requiredEquipment.join(', '),
      description: exercise.description,
      difficulty: exercise.difficulty,
      isTimeBased: exercise.isTimeBased,
      mediaUrl: exercise.media[0]?.url || '',
    });
    setEditDialogOpen(true);
  };

  const handleUpdateExercise = async () => {
    if (!selectedExercise?._id) return;

    try {
      const token = localStorage.getItem('auth-token');
      const updates = {
        name: formData.name,
        aliases: formData.aliases.split(',').map(a => a.trim()).filter(Boolean),
        targetArea: formData.targetArea.split(',').map(a => a.trim()).filter(Boolean),
        requiredEquipment: formData.requiredEquipment.split(',').map(e => e.trim()).filter(Boolean),
        description: formData.description,
        difficulty: formData.difficulty,
        isTimeBased: formData.isTimeBased,
        media: formData.mediaUrl ? [{ type: 'youtube', url: formData.mediaUrl }] : [],
      };

      const response = await fetch('/api/exercises', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: selectedExercise._id.toString(), updates }),
      });

      if (!response.ok) throw new Error('Failed to update exercise');

      setEditDialogOpen(false);
      setSelectedExercise(null);
      resetForm();
      fetchExercises();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteClick = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setDeleteDialogOpen(true);
  };

  const handleDeleteExercise = async () => {
    if (!selectedExercise?._id) return;

    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/exercises?id=${selectedExercise._id.toString()}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to delete exercise');

      setDeleteDialogOpen(false);
      setSelectedExercise(null);
      fetchExercises();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      aliases: '',
      targetArea: '',
      requiredEquipment: '',
      description: '',
      difficulty: 'beginner',
      isTimeBased: false,
      mediaUrl: '',
    });
  };

  const allTargetAreas = Array.from(new Set(exercises.flatMap(e => e.targetArea)));
  const allEquipment = Array.from(new Set(exercises.flatMap(e => e.requiredEquipment)));

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => router.push('/workouts')}>
            <ArrowBack />
          </IconButton>
          <FitnessCenter sx={{ mr: 2 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Exercise Library
          </Typography>
          <Button color="inherit" startIcon={<Add />} onClick={() => setCreateDialogOpen(true)}>
            Create Exercise
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
          <TextField
            label="Search by name"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            sx={{ flex: 1 }}
          />
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Target Area</InputLabel>
            <Select
              value={filterTargetArea}
              label="Target Area"
              onChange={(e) => setFilterTargetArea(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {allTargetAreas.map(area => (
                <MenuItem key={area} value={area}>{area}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Equipment</InputLabel>
            <Select
              value={filterEquipment}
              label="Equipment"
              onChange={(e) => setFilterEquipment(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {allEquipment.map(eq => (
                <MenuItem key={eq} value={eq}>{eq}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Grid container spacing={3}>
          {filteredExercises.map((exercise) => (
            <Grid item xs={12} sm={6} md={4} key={exercise._id?.toString()}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {exercise.name}
                  </Typography>
                  <Box sx={{ mb: 1 }}>
                    <Chip label={exercise.difficulty} size="small" sx={{ mr: 1 }} />
                    <Chip label={exercise.isTimeBased ? 'Time-based' : 'Rep-based'} size="small" />
                  </Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {exercise.description || 'No description'}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" display="block">
                      <strong>Target:</strong> {exercise.targetArea.join(', ')}
                    </Typography>
                    {exercise.requiredEquipment.length > 0 && (
                      <Typography variant="caption" display="block">
                        <strong>Equipment:</strong> {exercise.requiredEquipment.join(', ')}
                      </Typography>
                    )}
                  </Box>
                </CardContent>
                <CardActions>
                  <IconButton size="small" onClick={() => handleEditClick(exercise)}>
                    <Edit />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDeleteClick(exercise)}>
                    <Delete />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {filteredExercises.length === 0 && (
          <Box textAlign="center" py={4}>
            <Typography color="text.secondary">
              No exercises found. Create your first exercise!
            </Typography>
          </Box>
        )}
      </Container>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Exercise</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <TextField
              label="Aliases (comma-separated)"
              value={formData.aliases}
              onChange={(e) => setFormData({ ...formData, aliases: e.target.value })}
            />
            <TextField
              label="Target Areas (comma-separated)"
              value={formData.targetArea}
              onChange={(e) => setFormData({ ...formData, targetArea: e.target.value })}
              required
              helperText="e.g., abs, shoulders, arms"
            />
            <TextField
              label="Required Equipment (comma-separated)"
              value={formData.requiredEquipment}
              onChange={(e) => setFormData({ ...formData, requiredEquipment: e.target.value })}
              helperText="e.g., dumbbells, barbell"
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
            />
            <FormControl>
              <InputLabel>Difficulty</InputLabel>
              <Select
                value={formData.difficulty}
                label="Difficulty"
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
              >
                <MenuItem value="beginner">Beginner</MenuItem>
                <MenuItem value="intermediate">Intermediate</MenuItem>
                <MenuItem value="advanced">Advanced</MenuItem>
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel>Exercise Type</InputLabel>
              <Select
                value={formData.isTimeBased ? 'time' : 'reps'}
                label="Exercise Type"
                onChange={(e) => setFormData({ ...formData, isTimeBased: e.target.value === 'time' })}
              >
                <MenuItem value="reps">Rep-based (sets × reps)</MenuItem>
                <MenuItem value="time">Time-based (duration)</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="YouTube URL (optional)"
              value={formData.mediaUrl}
              onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateExercise} variant="contained" disabled={!formData.name || !formData.targetArea}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Exercise</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <TextField
              label="Aliases (comma-separated)"
              value={formData.aliases}
              onChange={(e) => setFormData({ ...formData, aliases: e.target.value })}
            />
            <TextField
              label="Target Areas (comma-separated)"
              value={formData.targetArea}
              onChange={(e) => setFormData({ ...formData, targetArea: e.target.value })}
              required
              helperText="e.g., abs, shoulders, arms"
            />
            <TextField
              label="Required Equipment (comma-separated)"
              value={formData.requiredEquipment}
              onChange={(e) => setFormData({ ...formData, requiredEquipment: e.target.value })}
              helperText="e.g., dumbbells, barbell"
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
            />
            <FormControl>
              <InputLabel>Difficulty</InputLabel>
              <Select
                value={formData.difficulty}
                label="Difficulty"
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
              >
                <MenuItem value="beginner">Beginner</MenuItem>
                <MenuItem value="intermediate">Intermediate</MenuItem>
                <MenuItem value="advanced">Advanced</MenuItem>
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel>Exercise Type</InputLabel>
              <Select
                value={formData.isTimeBased ? 'time' : 'reps'}
                label="Exercise Type"
                onChange={(e) => setFormData({ ...formData, isTimeBased: e.target.value === 'time' })}
              >
                <MenuItem value="reps">Rep-based (sets × reps)</MenuItem>
                <MenuItem value="time">Time-based (duration)</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="YouTube URL (optional)"
              value={formData.mediaUrl}
              onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateExercise} variant="contained" disabled={!formData.name || !formData.targetArea}>
            Update
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Exercise</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedExercise?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteExercise} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
