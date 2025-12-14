import React, { memo } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import PropTypes from 'prop-types';
import { DEFAULT_MAP_REGION } from '../../constants/babySitter';

/**
 * קומפוננטת תצוגת מפה
 * מציגה בייביסיטרים על המפה כ-markers
 */
const SitterMapView = memo(({ sitters, userLocation, onMarkerPress }) => {
    return (
        <View style={styles.mapContainer}>
            <MapView
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={DEFAULT_MAP_REGION}
            >
                {/* מרקרים של בייביסיטרים */}
                {sitters.map((sitter) => (
                    <Marker
                        key={sitter.id}
                        coordinate={sitter.coordinate}
                        title={sitter.name}
                        description={`${sitter.price} ₪ לשעה`}
                        onPress={() => onMarkerPress && onMarkerPress(sitter)}
                    >
                        <View style={styles.markerContainer}>
                            <Image
                                source={{ uri: sitter.image }}
                                style={styles.markerImage}
                            />
                            {sitter.isSuperSitter && (
                                <View style={styles.markerBadge} />
                            )}
                        </View>
                    </Marker>
                ))}

                {/* מרקר של המשתמש */}
                {userLocation && (
                    <Marker
                        coordinate={userLocation}
                        anchor={{ x: 0.5, y: 0.5 }}
                    >
                        <View style={styles.userMarkerOuter}>
                            <View style={styles.userMarkerInner} />
                        </View>
                    </Marker>
                )}
            </MapView>
        </View>
    );
});

SitterMapView.propTypes = {
    sitters: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.number.isRequired,
            coordinate: PropTypes.shape({
                latitude: PropTypes.number.isRequired,
                longitude: PropTypes.number.isRequired,
            }).isRequired,
            name: PropTypes.string.isRequired,
            price: PropTypes.number.isRequired,
            image: PropTypes.string.isRequired,
            isSuperSitter: PropTypes.bool,
        })
    ).isRequired,
    userLocation: PropTypes.shape({
        latitude: PropTypes.number.isRequired,
        longitude: PropTypes.number.isRequired,
    }),
    onMarkerPress: PropTypes.func,
};

SitterMapView.defaultProps = {
    userLocation: null,
    onMarkerPress: null,
};

SitterMapView.displayName = 'SitterMapView';

const styles = StyleSheet.create({
    mapContainer: {
        flex: 1,
        borderRadius: 30,
        overflow: 'hidden',
        marginHorizontal: 20,
        marginBottom: 80,
    },
    map: {
        width: '100%',
        height: '100%',
    },
    markerContainer: {
        alignItems: 'center',
    },
    markerImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#fff',
    },
    markerBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FFC107',
        borderWidth: 1,
        borderColor: '#fff',
    },
    userMarkerOuter: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(79, 70, 229, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    userMarkerInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#4f46e5',
    },
});

export default SitterMapView;
