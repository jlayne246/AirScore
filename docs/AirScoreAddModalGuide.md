For AIRScore, I'd make it feel more like selecting scores for a setlist than a generic CRUD form.

Something like this:

```text id="efp4su"
┌───────────────────────────────┐
│ Add Scores                    │
│                               │
│ Search scores...              │
│ ────────────────────────────  │
│ ☑ The heavens are telling     │
│   Beethoven                   │
│                               │
│ ☐ Organ Works for the Church  │
│   Robert Lind                 │
│                               │
│ ☑ Transformations             │
│   BYU                         │
│                               │
│                Cancel  Add(2) │
└───────────────────────────────┘
```

I'd build it with React Native's `Modal`:

```tsx id="q2b4wo"
<Modal
  visible={addScoresVisible}
  animationType="slide"
  transparent
>
  <View
    style={{
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      padding: 20,
    }}
  >
    <View
      style={{
        backgroundColor: 'white',
        borderRadius: 16,
        maxHeight: '80%',
        padding: 20,
      }}
    >
      ...
    </View>
  </View>
</Modal>
```

---

### Search

```tsx id="kxg8gz"
<TextInput
  placeholder="Search scores..."
  value={searchText}
  onChangeText={setSearchText}
  style={{
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  }}
/>
```

---

### Score Row

```tsx id="ew0whb"
<TouchableOpacity
  onPress={() => toggleScore(item.id!)}
  style={{
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  }}
>
  <Ionicons
    name={
      selectedIds.includes(item.id!)
        ? 'checkbox'
        : 'square-outline'
    }
    size={24}
    color="#2563EB"
  />

  <View style={{ marginLeft: 12, flex: 1 }}>
    <Text
      style={{
        fontSize: 16,
        fontWeight: '600',
      }}
    >
      {item.title}
    </Text>

    <Text
      style={{
        color: '#6B7280',
      }}
    >
      {item.metadata?.composer ??
       item.metadata?.editor ??
       'Unknown'}
    </Text>
  </View>
</TouchableOpacity>
```

---

### Footer

```tsx id="pn82yt"
<View
  style={{
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  }}
>
  <TouchableOpacity
    onPress={onClose}
    style={{ marginRight: 16 }}
  >
    <Text>Cancel</Text>
  </TouchableOpacity>

  <TouchableOpacity
    onPress={handleAdd}
    style={{
      backgroundColor: '#2563EB',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
    }}
  >
    <Text
      style={{
        color: 'white',
        fontWeight: '600',
      }}
    >
      Add ({selectedIds.length})
    </Text>
  </TouchableOpacity>
</View>
```

---

I'd also exclude scores already in the setlist:

```ts id="pimz35"
const availableScores = allScores.filter(
  score => !musicIds.includes(score.id!)
);
```

That way the modal only shows scores that can actually be added.

The flow becomes:

```text id="l9nd98"
Setlist Detail
    ↓
Add Scores
    ↓
Search / Multi-select
    ↓
Add (3)
    ↓
Appends to end of setlist
```

which fits perfectly with the `position` field you'll use for ordering later.
