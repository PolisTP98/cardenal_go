import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from './Theme';
import { searchLocations } from '../src/api/locationApi';

export default function LocationSearchInput({
  label,
  placeholder,
  value = '',
  onChangeText,
  onSelectLocation,
  iconName = 'location-sharp',
  iconColor = COLORS.primary,
  style,
}) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceTimerRef = useRef(null);

  // Sync internal state with external controlled value
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const handleTextChange = (text) => {
    setQuery(text);
    if (onChangeText) onChangeText(text);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!text || text.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setShowDropdown(true);

    debounceTimerRef.current = setTimeout(async () => {
      const results = await searchLocations(text);
      setSuggestions(results);
      setIsSearching(false);
    }, 400);
  };

  const handleSelectSuggestion = (item) => {
    setQuery(item.address || item.name);
    setSuggestions([]);
    setShowDropdown(false);
    if (onSelectLocation) {
      onSelectLocation(item);
    }
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    if (onChangeText) onChangeText('');
  };

  return (
    <View style={[styles.container, style, { zIndex: showDropdown ? 9999 : (style && style.zIndex ? style.zIndex : 10) }]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={styles.inputWrapper}>
        <Ionicons name={iconName} size={20} color={iconColor} style={styles.leftIcon} />
        
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textSecondary}
          value={query}
          onChangeText={handleTextChange}
          onFocus={() => {
            if (suggestions.length > 0) setShowDropdown(true);
          }}
        />

        {isSearching ? (
          <ActivityIndicator size="small" color={COLORS.primary} style={styles.rightIcon} />
        ) : query ? (
          <TouchableOpacity onPress={handleClear} style={styles.rightIcon}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        ) : null}
      </View>

      {showDropdown && (
        <View style={styles.dropdownContainer}>
          {suggestions.length > 0 ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 220 }}
              nestedScrollEnabled={true}
            >
              {suggestions.map((item) => (
                <TouchableOpacity
                  key={item.id.toString()}
                  style={styles.suggestionItem}
                  onPress={() => handleSelectSuggestion(item)}
                >
                  <Ionicons name="location-outline" size={18} color={COLORS.primary} style={styles.itemIcon} />
                  <View style={styles.itemTextContainer}>
                    <Text style={styles.itemTitle} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.itemSub} numberOfLines={2}>{item.address}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            !isSearching && (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>No se encontraron ubicaciones</Text>
              </View>
            )
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
    zIndex: 10,
    position: 'relative',
  },
  label: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 8,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground || '#F8FAFC',
    borderRadius: SIZES.radius || 12,
    borderWidth: 1,
    borderColor: COLORS.border || '#CBD5E1',
    paddingHorizontal: 12,
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    padding: 6,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text || '#1E293B',
  },
  dropdownContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
    maxHeight: 220,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 999,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemIcon: {
    marginRight: 10,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  itemSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  noResults: {
    padding: 14,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 13,
    color: '#94A3B8',
  },
});
