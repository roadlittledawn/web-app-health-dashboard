'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  TextField,
  Toolbar,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
} from '@mui/material';
import {
  ArrowBack,
  EmojiEvents,
  Add,
  Delete,
  CheckCircle,
} from '@mui/icons-material';

interface Goal {
  _id: string;
  goal_type: string;
  activity_type?: string;
  sport_type?: string;
  target_value: number;
  current_value: number;
  unit: string;
  time_period: string;
  start_date: string;
  end_date?: string;
  status: string;
  description?: string;
  progress: {
    percentage: number;
    remaining: number;
  };
}

export default function FitnessGoalsPage() {
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    goal_type: 'distance',
    activity_type: '',
    target_value: '',
    unit: 'mi',
    time_period: 'month',
    description: '',
  });

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    setLoading(true);
    setError('');

    const token = localStorage.getItem('auth-token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await fetch('/api/fitness-goals', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch goals');
      }

      const data = await response.json();
      setGoals(data.data);
    } catch (err) {
      setError('Failed to load goals');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    setSaving(true);
    setError('');

    const token = localStorage.getItem('auth-token');

    try {
      const response = await fetch('/api/fitness-goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          target_value: parseFloat(formData.target_value),
          start_date: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to create goal');
      }

      setOpenDialog(false);
      setFormData({
        goal_type: 'distance',
        activity_type: '',
        target_value: '',
        unit: 'mi',
        time_period: 'month',
        description: '',
      });
      await fetchGoals();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    const token = localStorage.getItem('auth-token');

    try {
      const response = await fetch(`/api/fitness-goals?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to delete goal');
      }

      await fetchGoals();
    } catch (err) {
      setError('Failed to delete goal');
      console.error(err);
    }
  };

  const handleCompleteGoal = async (id: string) => {
    const token = localStorage.getItem('auth-token');

    try {
      const response = await fetch('/api/fitness-goals', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          id,
          updates: { status: 'completed' },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update goal');
      }

      await fetchGoals();
    } catch (err) {
      setError('Failed to update goal');
      console.error(err);
    }
  };

  const getUnitOptions = (goalType: string) => {
    switch (goalType) {
      case 'distance':
        return ['mi', 'km', 'meters'];
      case 'duration':
        return ['hours', 'minutes'];
      case 'elevation':
        return ['ft', 'meters'];
      case 'frequency':
        return ['activities'];
      default:
        return [''];
    }
  };

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Button
            color="inherit"
            component={Link}
            href="/workouts"
            startIcon={<ArrowBack />}
            sx={{ mr: 2 }}
          >
            Workouts
          </Button>
          <EmojiEvents sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Fitness Goals
          </Typography>
          <Button
            color="inherit"
            startIcon={<Add />}
            onClick={() => setOpenDialog(true)}
          >
            New Goal
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {loading && (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        )}

        {!loading && goals.length === 0 && (
          <Alert severity="info">
            No goals yet. Click "New Goal" to create your first fitness goal.
          </Alert>
        )}

        {/* Active Goals */}
        {!loading && activeGoals.length > 0 && (
          <>
            <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
              Active Goals
            </Typography>
            <Grid container spacing={2} sx={{ mb: 4 }}>
              {activeGoals.map((goal) => (
                <Grid item xs={12} md={6} key={goal._id}>
                  <Card>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                        <Box>
                          <Typography variant="h6">
                            {goal.goal_type.replace(/_/g, ' ').toUpperCase()}
                            {goal.activity_type && ` - ${goal.activity_type}`}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {goal.description || `${goal.time_period} goal`}
                          </Typography>
                        </Box>
                        <Box display="flex" gap={1}>
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleCompleteGoal(goal._id)}
                            title="Mark Complete"
                          >
                            <CheckCircle />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteGoal(goal._id)}
                            title="Delete Goal"
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      </Box>

                      <Box mb={2}>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="body2">
                            {goal.current_value.toFixed(1)} / {goal.target_value} {goal.unit}
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {goal.progress.percentage.toFixed(1)}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(goal.progress.percentage, 100)}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: 'grey.200',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: goal.progress.percentage >= 100 ? 'success.main' : 'primary.main',
                            },
                          }}
                        />
                      </Box>

                      <Box display="flex" gap={1} flexWrap="wrap">
                        <Chip
                          label={goal.time_period}
                          size="small"
                          variant="outlined"
                        />
                        {goal.progress.percentage >= 100 && (
                          <Chip
                            label="Completed!"
                            size="small"
                            color="success"
                          />
                        )}
                        {goal.progress.percentage < 100 && (
                          <Chip
                            label={`${goal.progress.remaining.toFixed(1)} ${goal.unit} remaining`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </>
        )}

        {/* Completed Goals */}
        {!loading && completedGoals.length > 0 && (
          <>
            <Typography variant="h5" gutterBottom sx={{ mb: 2, mt: 4 }}>
              Completed Goals
            </Typography>
            <Grid container spacing={2}>
              {completedGoals.map((goal) => (
                <Grid item xs={12} md={6} key={goal._id}>
                  <Card sx={{ opacity: 0.8 }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                        <Box>
                          <Typography variant="h6">
                            {goal.goal_type.replace(/_/g, ' ').toUpperCase()}
                            {goal.activity_type && ` - ${goal.activity_type}`}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {goal.description || `${goal.time_period} goal`}
                          </Typography>
                        </Box>
                        <Chip
                          icon={<CheckCircle />}
                          label="Completed"
                          size="small"
                          color="success"
                        />
                      </Box>
                      <Typography variant="body2">
                        {goal.current_value.toFixed(1)} / {goal.target_value} {goal.unit}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </>
        )}

        {/* Create Goal Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Create New Fitness Goal</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Goal Type</InputLabel>
                  <Select
                    value={formData.goal_type}
                    label="Goal Type"
                    onChange={(e) => {
                      const newGoalType = e.target.value;
                      const units = getUnitOptions(newGoalType);
                      setFormData({
                        ...formData,
                        goal_type: newGoalType,
                        unit: units[0],
                      });
                    }}
                  >
                    <MenuItem value="distance">Distance</MenuItem>
                    <MenuItem value="duration">Duration</MenuItem>
                    <MenuItem value="elevation">Elevation Gain</MenuItem>
                    <MenuItem value="frequency">Activity Frequency</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Target Value"
                  value={formData.target_value}
                  onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Unit</InputLabel>
                  <Select
                    value={formData.unit}
                    label="Unit"
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  >
                    {getUnitOptions(formData.goal_type).map(unit => (
                      <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Time Period</InputLabel>
                  <Select
                    value={formData.time_period}
                    label="Time Period"
                    onChange={(e) => setFormData({ ...formData, time_period: e.target.value })}
                  >
                    <MenuItem value="week">Week</MenuItem>
                    <MenuItem value="month">Month</MenuItem>
                    <MenuItem value="year">Year</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Activity Type (Optional)</InputLabel>
                  <Select
                    value={formData.activity_type}
                    label="Activity Type (Optional)"
                    onChange={(e) => setFormData({ ...formData, activity_type: e.target.value })}
                  >
                    <MenuItem value="">All Activities</MenuItem>
                    <MenuItem value="Run">Run</MenuItem>
                    <MenuItem value="Ride">Ride</MenuItem>
                    <MenuItem value="Swim">Swim</MenuItem>
                    <MenuItem value="Hike">Hike</MenuItem>
                    <MenuItem value="Walk">Walk</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description (Optional)"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleCreateGoal} variant="contained" disabled={saving || !formData.target_value}>
              {saving ? 'Creating...' : 'Create Goal'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
