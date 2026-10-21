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
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  IconButton,
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
  Edit,
  Delete,
  PlayArrow,
  FitnessCenter,
} from '@mui/icons-material';
import { WorkoutProgram } from '@/types/workout-programs';

export default function ProgramsPage() {
  const router = useRouter();
  const [programs, setPrograms] = useState<WorkoutProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<WorkoutProgram | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/workout-programs', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch programs');

      const data = await response.json();
      setPrograms(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProgram = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/workout-programs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to create program');

      setCreateDialogOpen(false);
      setFormData({ name: '', description: '' });
      fetchPrograms();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDeleteClick = (program: WorkoutProgram) => {
    setSelectedProgram(program);
    setDeleteDialogOpen(true);
  };

  const handleDeleteProgram = async () => {
    if (!selectedProgram?._id) return;

    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/workout-programs?id=${selectedProgram._id.toString()}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to delete program');

      setDeleteDialogOpen(false);
      setSelectedProgram(null);
      fetchPrograms();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleStartWorkout = (programId: string) => {
    router.push(`/workouts/session/${programId}`);
  };

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
            Workout Programs
          </Typography>
          <Button color="inherit" startIcon={<Add />} onClick={() => setCreateDialogOpen(true)}>
            Create Program
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Grid container spacing={3}>
          {programs.map((program) => (
            <Grid item xs={12} sm={6} md={4} key={program._id?.toString()}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {program.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {program.description || 'No description'}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Chip 
                      label={`${program.exercises.length} exercises`} 
                      size="small" 
                      sx={{ mr: 1 }} 
                    />
                    <Chip 
                      label={program.status} 
                      size="small" 
                      color={program.status === 'active' ? 'success' : 'default'}
                    />
                  </Box>
                </CardContent>
                <CardActions>
                  <Button 
                    size="small" 
                    startIcon={<PlayArrow />}
                    onClick={() => handleStartWorkout(program._id!.toString())}
                  >
                    Start
                  </Button>
                  <Button 
                    size="small" 
                    startIcon={<Edit />}
                    onClick={() => router.push(`/workouts/programs/${program._id!.toString()}`)}
                  >
                    Edit
                  </Button>
                  <IconButton size="small" onClick={() => handleDeleteClick(program)}>
                    <Delete />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {programs.length === 0 && (
          <Box textAlign="center" py={4}>
            <Typography color="text.secondary">
              No programs found. Create your first workout program!
            </Typography>
          </Box>
        )}
      </Container>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Workout Program</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Program Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateProgram} variant="contained" disabled={!formData.name}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Program</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete &quot;{selectedProgram?.name}&quot;? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteProgram} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
