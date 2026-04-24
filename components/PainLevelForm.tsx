'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Slider,
  Typography,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { formatLocalDate } from '@/lib/dateUtils';

interface PainLevelEntry {
  date: Date;
  intensity: number;
}

interface PainLevelFormProps {
  incidentId: string;
  painLevels: PainLevelEntry[];
  onUpdate: () => void;
}

export default function PainLevelForm({ incidentId, painLevels, onUpdate }: PainLevelFormProps) {
  const [open, setOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [intensity, setIntensity] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('auth-token');
      const updatedPainLevels = [...painLevels];
      
      const newEntry = {
        date: new Date(date + 'T12:00:00'), // Add noon time to avoid timezone issues
        intensity
      };

      if (editingIndex !== null) {
        updatedPainLevels[editingIndex] = newEntry;
      } else {
        updatedPainLevels.push(newEntry);
      }

      const response = await fetch('/api/incidents-update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          _id: incidentId,
          painIntensityOverTime: updatedPainLevels
        }),
      });

      if (!response.ok) throw new Error('Failed to update pain levels');

      setOpen(false);
      setEditingIndex(null);
      setDate(new Date().toISOString().split('T')[0]);
      setIntensity(5);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (index: number) => {
    const entry = painLevels[index];
    setDate(new Date(entry.date).toISOString().split('T')[0]);
    setIntensity(entry.intensity);
    setEditingIndex(index);
    setOpen(true);
  };

  const handleDelete = async (index: number) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth-token');
      const updatedPainLevels = painLevels.filter((_, i) => i !== index);

      const response = await fetch('/api/incidents-update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          _id: incidentId,
          painIntensityOverTime: updatedPainLevels
        }),
      });

      if (!response.ok) throw new Error('Failed to delete pain level');
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const sortedPainLevels = [...painLevels].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Pain Levels Over Time</Typography>
        <Button
          startIcon={<Add />}
          variant="outlined"
          onClick={() => setOpen(true)}
          size="small"
        >
          Add Entry
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {sortedPainLevels.length > 0 && (
        <List dense>
          {sortedPainLevels.map((entry, _index) => {
            const originalIndex = painLevels.findIndex(p => 
              p.date === entry.date && p.intensity === entry.intensity
            );
            return (
              <ListItem key={`${entry.date}-${entry.intensity}`}>
                <ListItemText
                  primary={`${entry.intensity}/10`}
                  secondary={formatLocalDate(entry.date)}
                />
                <ListItemSecondaryAction>
                  <IconButton size="small" onClick={() => handleEdit(originalIndex)}>
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(originalIndex)}>
                    <Delete fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            );
          })}
        </List>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingIndex !== null ? 'Edit Pain Level' : 'Add Pain Level'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              fullWidth
              sx={{ mb: 3 }}
              InputLabelProps={{ shrink: true }}
            />
            
            <Typography gutterBottom>Pain Level: {intensity}/10</Typography>
            <Slider
              value={intensity}
              onChange={(_, value) => setIntensity(value as number)}
              min={0}
              max={10}
              step={1}
              marks
              valueLabelDisplay="auto"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} variant="contained">
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
