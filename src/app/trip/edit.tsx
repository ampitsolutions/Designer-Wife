import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { DateField } from '@/components/DateField';
import { Button } from '@/components/ui';
import { MAX_TRIP_DAYS } from '@/config';
import { useAuth } from '@/lib/auth';
import { daysBetween } from '@/lib/dates';
import { createTrip, deleteTrip, getTrip, updateTrip, type Trip } from '@/lib/trips';
import { findPlace } from '@/lib/weather';
import { page } from '@/lib/layout';
import { C, F, input as inputBase } from '@/theme';

/** New trip (no id) or edit trip (?id=…). */
export default function EditTrip() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { session } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const [itinerary, setItinerary] = useState('');
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);

  useEffect(() => {
    if (!id) return;
    getTrip(id)
      .then((t) => {
        setTrip(t);
        setName(t.name);
        setDestination(t.destination ?? '');
        setStart(t.start_date);
        setEnd(t.end_date);
        setItinerary(t.itinerary ?? '');
      })
      .catch((e) => Alert.alert('Could not load trip', String(e?.message ?? e)))
      .finally(() => setLoading(false));
  }, [id]);

  async function save() {
    if (!name.trim()) return Alert.alert('Give the trip a name');
    if (start && end && end < start) return Alert.alert('End date is before the start date');
    if (start && end && daysBetween(start, end) + 1 > MAX_TRIP_DAYS)
      return Alert.alert(`Trips can be up to ${MAX_TRIP_DAYS} days`);

    setBusy('save');
    try {
      // Look up the place for weather. Keep the old one if the destination didn't change.
      let place = trip && trip.destination === destination.trim() && trip.latitude != null
        ? { label: trip.place_label ?? destination, latitude: trip.latitude, longitude: trip.longitude! }
        : null;
      if (!place && destination.trim()) {
        place = await findPlace(destination).catch(() => null);
        if (!place) Alert.alert('Place not found', 'Weather will be skipped. Try a city name, e.g. "Lisbon".');
      }
      const fields = {
        name: name.trim(),
        destination: destination.trim() || null,
        place_label: place?.label ?? null,
        latitude: place?.latitude ?? null,
        longitude: place?.longitude ?? null,
        start_date: start,
        end_date: end ?? start,
        itinerary: itinerary.trim() || null,
      };
      if (trip) {
        await updateTrip(trip.id, fields);
        router.back();
      } else {
        const newId = await createTrip(fields);
        router.replace(`/trip/${newId}`);
      }
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  }

  function remove() {
    if (!trip) return;
    Alert.alert('Delete this trip?', 'Its day plans and packing list are deleted too.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy('delete');
          try {
            await deleteTrip(trip.id);
            router.dismissTo('/trips');
          } catch (e) {
            Alert.alert('Could not delete', e instanceof Error ? e.message : String(e));
            setBusy(null);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  const isOwner = !trip || trip.owner_id === session?.user.id;

  return (
    <ScrollView contentContainerStyle={[styles.container, page]} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Trip name</Text>
      <TextInput style={styles.input} placeholder="e.g. Lisbon anniversary" value={name} onChangeText={setName} />

      <Text style={styles.label}>Destination</Text>
      <TextInput style={styles.input} placeholder="City, e.g. Lisbon" value={destination} onChangeText={setDestination} />

      <Text style={styles.label}>Start date</Text>
      <DateField value={start} onChange={(d) => { setStart(d); if (!end || end < d) setEnd(d); }} />
      <Text style={styles.label}>End date</Text>
      <DateField value={end} onChange={setEnd} minimumDate={start} />

      <Text style={styles.label}>Itinerary</Text>
      <Text style={styles.hint}>Paste or type your plans. The AI uses this to pick outfits.</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        multiline
        placeholder={'e.g.\nDay 1: arrive, dinner in Alfama\nDay 2: Sintra day trip, lots of walking\nDay 3: rooftop bar in the evening'}
        value={itinerary}
        onChangeText={setItinerary}
      />

      <View style={styles.buttons}>
        {trip && isOwner && <Button title="Delete" variant="danger" onPress={remove} busy={busy === 'delete'} disabled={!!busy} />}
        <Button title={trip ? 'Save' : 'Create trip'} onPress={save} busy={busy === 'save'} disabled={!!busy} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8, paddingBottom: 48 },
  label: { fontFamily: F.semibold, marginTop: 10 },
  hint: { color: C.muted },
  input: { ...inputBase },
  multiline: { minHeight: 140, textAlignVertical: 'top' },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 24 },
});
