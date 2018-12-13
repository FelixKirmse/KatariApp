import React from 'react';
import { 
  Platform, 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Dimensions, 
  TextInput, 
  Image, 
  Alert, 
  TouchableOpacity, 
  Modal,
  Picker,
} from 'react-native';
import { ListItem, Button, Card, Icon } from "react-native-elements";
import MapView, { PROVIDER_GOOGLE, Marker, AnimatedRegion, Polyline, Callout } from 'react-native-maps';
import { DEFAULT_MAP, ADD_LOCATION } from "../constants/MapLayout";
import { getLocationPermission } from '../utils/permissions';
// import Svg from 'expo';
// const { Image } = Svg;
import firestore from "../utils/firestore";
import firebase from "../utils/firebaseClient";
import { ScrollView } from 'react-native-gesture-handler';
import { createStackNavigator, NavigationActions } from 'react-navigation';

const DEFAULT_LATITUDE = 30.822279;
const DEFAULT_LONGITUDE = 163.016783;
const LATITUDE_DELTA = 0.001;
const LONGITUDE_DELTA = 0.003;

class Main extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      latitude: DEFAULT_LATITUDE,
      longitude: DEFAULT_LONGITUDE,
      coordinate: new AnimatedRegion({
        latitude: DEFAULT_LATITUDE,
        longitude: DEFAULT_LONGITUDE
      }),
      latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      markers: [],
      currentRegion: {
        latitude: DEFAULT_LATITUDE,
        longitude: DEFAULT_LONGITUDE,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      },
    };
    this.getMapRegion = this.getMapRegion.bind(this);
    this.onMarkerPress = this.onMarkerPress.bind(this);
    this.toAddLocation = this.toAddLocation.bind(this);
    this.onRegionChange = this.onRegionChange.bind(this);
  }

  componentDidMount() {
    getLocationPermission();
    let markers = [];
    firestore
      .collection("locations")
      .get()
      .then(snapshot => {
        snapshot.forEach(doc => {
          const marker = doc.data();
          marker["title"] = doc.id;
          marker["coordinate"] = {
            longitude: marker.longitude,
            latitude: marker.latitude
          };
          markers.push(marker);
        });
        this.setState({
          markers
        });
        this.forceUpdate();
      })
      .catch(err => {
        console.log("Error getting documents", err);
      });
    this.watchID = navigator.geolocation.watchPosition(
      position => {
        const { coordinate } = this.state;
        const { latitude, longitude } = position.coords;
        const newCoordinate = {
          latitude,
          longitude
        };
        coordinate.timing(newCoordinate).start();

        this.setState({
          latitude,
          longitude,
        });
      },
      error => console.log(error),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );
  }

  static navigationOptions = {
    header: null
  };

  getMapRegion = () => ({
    latitude: this.state.latitude,
    longitude: this.state.longitude,
    latitudeDelta: this.state.latitudeDelta,
    longitudeDelta: this.state.longitudeDelta,
  });

  toAddLocation() {
    const navigateAction = NavigationActions.navigate({
      routeName: 'AddLocation',
      params: {
        region: this.state.currentRegion
      }
  })
  this.props.navigation.dispatch(navigateAction);
  }

  onMarkerPress(marker) {
    console.log("Marker Pressed.", marker)
    const navigateAction = NavigationActions.navigate({
      routeName: 'Location',
      params: {
        title: marker.title,
        image: marker.image,
        description: marker.description
      }
  })
  this.props.navigation.dispatch(navigateAction);
  }

  onRegionChange(currentRegion) {
    this.setState({ currentRegion, 
      latitude: currentRegion.latitude, 
      longitude: currentRegion.longitude, 
      latitudeDelta: currentRegion.latitudeDelta,
      longitudeDelta: currentRegion.longitudeDelta,
    })
  }

  render() {
    return (
      <View style={styles.map}>
        <MapView
        ref={MapView => (this.MapView = MapView)}
        region={this.getMapRegion()}
        onRegionChangeComplete={this.onRegionChange}
        style={styles.map}
        loadingEnabled={true}
        loadingIndicatorColor="#666666"
        loadingBackgroundColor="#eeeeee"
        moveOnMarkerPress
        showsUserLocation
        showsCompass
        customMapStyle={DEFAULT_MAP}
        showsPointsOfInterest={false}
        provider={PROVIDER_GOOGLE}
      >
        {this.state.markers.map((marker, index) => {
          return (
            <MapView.Marker
              key={index}
              coordinate={marker.coordinate}
            >
              <Callout style={styles.callout} onPress={() => this.onMarkerPress(marker)}>
              <View style={styles.container}>
                <Text style={styles.title}>{marker.title}</Text>

                <Text style={styles.description}>{marker.description}</Text>
              </View> 
              </Callout>
            </MapView.Marker>)
        })
        }
      </MapView>
      <View style={styles.addBtnPosition}>
      <TouchableOpacity
          style={styles.addButton}
          onPress={() => {this.toAddLocation()}} 
        >
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
    );
  }
}

class AddLocation extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      latitude: DEFAULT_LATITUDE,
      longitude: DEFAULT_LONGITUDE,
      coordinate: new AnimatedRegion({
        latitude: DEFAULT_LATITUDE,
        longitude: DEFAULT_LONGITUDE
      }),
      markers: [],
      modalVisible: false,
      categories: [
        "Entertainment",
        "Attractions",
        "Shopping",
        "Restaurants",
        "Nightlife",
        "Information",
        "Events",
        "Transportation"],
      selectedCategory: undefined,
      newLocationTitle: undefined,
      newLocationDescription: undefined,
      newLocationImage: "https://media.sproutsocial.com/uploads/2017/02/10x-featured-social-media-image-size.png",
    };
    this.getMapRegion = this.getMapRegion.bind(this);
    this.onRegionChange = this.onRegionChange.bind(this);
  }

  componentDidMount() {
    let markers = [];
    firestore
      .collection("locations")
      .get()
      .then(snapshot => {
        snapshot.forEach(doc => {
          const marker = doc.data();
          marker["title"] = doc.id;
          marker["coordinate"] = {
            longitude: marker.longitude,
            latitude: marker.latitude
          };
          markers.push(marker);
        });
        this.setState({
          markers
        });
        this.forceUpdate();
      })
      .catch(err => {
        console.log("Error getting documents", err);
      });

      this.setState({
        latitude: this.props.navigation.state.params.region.latitude,
        longitude: this.props.navigation.state.params.region.longitude,
        latitudeDelta: this.props.navigation.state.params.region.latitudeDelta,
        longitudeDelta: this.props.navigation.state.params.region.longitudeDelta,
      })

    this.watchID = navigator.geolocation.watchPosition(
      position => {
        const { coordinate } = this.state;
        const { latitude, longitude } = position.coords;
        const newCoordinate = {
          latitude,
          longitude
        };
        coordinate.timing(newCoordinate).start();
        this.setState({
          latitude,
          longitude,
        });
      },
      error => console.log(error),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );
  }

  static navigationOptions = {
    title: "Add Location",
    // header: null,
  };

  getMapRegion = () => ({
    latitude: this.state.latitude,
    longitude: this.state.longitude,
    latitudeDelta: this.state.latitudeDelta,
    longitudeDelta: this.state.longitudeDelta,
  });

  saveNewLocation() {
    if (
      !this.state.newLocationTitle ||
      !this.state.selectedCategory ||
      !this.state.newLocationDescription ||
      !this.state.newLocationImage
      ) {
        Alert.alert(
          "Missing some field(s)!", 
          "Please make sure to fill everything out.", 
          [{text: 'OK', onPress: () => console.log('OK Pressed')},]
        )
      } else {
    const newLocation = {
      category: this.state.selectedCategory,
      latitude: this.state.latitude,
      longitude: this.state.longitude,
      description: this.state.newLocationDescription,
      image: this.state.newLocationImage,
    };
    firestore
      .collection("locations")
      .doc(this.state.newLocationTitle)
      .set(newLocation)
      .then(() => {
        newLocation["coordinate"] = {latitude: this.state.latitude, longitude: this.state.longitude};
        this.setState({
          modalVisible: false,
          markers: [...this.state.markers, newLocation],
          selectedCategory: undefined,
          newLocationDescription: undefined,
          newLocationTitle: undefined,
        });
      });
    }
  }

  onRegionChange(region) {
    this.setState({
      latitude: region.latitude, 
      longitude: region.longitude,
      latitudeDelta: region.latitudeDelta,
      longitudeDelta: region.longitudeDelta,
    })
  }
  

  render() {
    return (
      <View style={styles.map}>
        <Modal
          // animationType="slide"
          transparent={false}
          visible={this.state.modalVisible}
          onRequestClose={()=> this.setState({modalVisible: false})}
        >
          <View>
            <Text style={styles.detailTitle}>Adding Location</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Name of location:"
              onChangeText={text => this.setState({ newLocationTitle: text })}
            />
            <Picker
              selectedValue={this.state.selectedCategory}
              style={{ height: 50, width: 100 }}
              onValueChange={(itemValue, itemIndex) => this.setState({selectedCategory: itemValue})}
            >
            <Picker.Item key={-1} label="Select a Category" value={undefined} />
              {this.state.categories.map((category, index) => <Picker.Item key={index} label={category} value={category} />)}
            </Picker>
            <TextInput
              style={styles.textInput}
              placeholder="Enter a description about the location:"
              onChangeText={text => this.setState({ newLocationDescription: text })}
            />
            <Button
              title="Save location."
              onPress={() => {
                this.saveNewLocation();
              }}
            />
          </View>
        </Modal>

        <MapView
        ref={MapView => (this.MapView = MapView)}
        region={this.getMapRegion()}
        initialRegion={this.props.navigation.state.params.region}
        onRegionChangeComplete={this.onRegionChange}
        style={styles.map}
        loadingEnabled={true}
        loadingIndicatorColor="#666666"
        loadingBackgroundColor="#eeeeee"
        moveOnMarkerPress
        showsUserLocation
        showsCompass
        customMapStyle={DEFAULT_MAP}
        showsPointsOfInterest={false}
        provider={PROVIDER_GOOGLE}
      >
        {this.state.markers.map((marker, index) => {
          return (
            <MapView.Marker
              key={index}
              coordinate={marker.coordinate}
            >
              <Callout style={styles.callout} >
              <View style={styles.container}>
                <Text style={styles.title}>{marker.title}</Text>
                {/* <Svg width={50} height={50}>
                    <Image
                        href={{uri: marker.image}}
                        width={50} height={50} />
                </Svg> */}
                <Text style={styles.description}>{marker.description}</Text>
              </View> 
              </Callout>
            </MapView.Marker>)
        })
        }
      </MapView>
      <View style={styles.addBtnPosition}>
      <TouchableOpacity
          style={styles.addButton}
          onPress={() => this.setState({modalVisible:true})} 
        >
          <Text style={styles.addBtnText}>✓</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.centerPin} >
      <Icon name="md-pin" 
        type="ionicon"
        size={40}
        color="#f00" 
      />
      </View>
    </View>
    );
  }
}

class Location  extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      stories: [],
      isAddStoryFormVisible: false,
      newStoryTitle: "",
      newStoryText: ""
    };
    this.saveNewStory = this.saveNewStory.bind(this);
  }

  componentDidMount() {
    newReviews = [];
    firestore
      .collection("stories")
      .where("location", "==", this.props.navigation.state.params.title)
      .get()
      .then(snapshot => {
        snapshot.forEach(doc => {
          newReviews.push(doc.data());
        });
      })
      .then(() => {
        this.setState({
          stories: newReviews
        });
      });
  }

  static navigationOptions = {
    // title: `${this.props.navigation.state.params.title`,
    header: null,
    headerMode: 'none'
  };

  saveNewStory() {
    const newStory = {
      userID: firebase.auth().currentUser.uid,
      title: this.state.newStoryTitle,
      story: this.state.newStoryText,
      location: this.props.navigation.state.params.title
    };
    firestore
      .collection("stories")
      .doc()
      .set(newStory)
      .then(() => {
        this.setState({
          isAddStoryFormVisible: false,
          stories: [...this.state.stories, newStory]
        });
      });
  }


  render() {
    return (
    <ScrollView>
      <View style={styles.location}>
              <Text style={styles.detailTitle}>{this.props.navigation.state.params.title}</Text>
              {this.props.navigation.state.params.image !== undefined ? (
                // display image only if exist
                <Image
                  style={styles.detailImage}
                  source={{ uri: this.props.navigation.state.params.image }}
                />
              ) : (
                  <View />
                )}
              <Text style={styles.detailText}>
                {this.props.navigation.state.params.description}
              </Text>
              <Button
                title="Add your story"
                onPress={() => {
                  this.setState({ isAddStoryFormVisible: true });
                }}
              />
              {this.state.isAddStoryFormVisible ? (
                // DISPLAY THE NEW STORY FORM
                <View>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Put a title to your story"
                    onChangeText={text => this.setState({ newStoryTitle: text })}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Type here your story!"
                    onChangeText={text => this.setState({ newStoryText: text })}
                  />
                  <Button
                    title="Save your story"
                    onPress={() => {
                      this.saveNewStory();
                    }}
                  />
                </View>
              ) : (
                  <View />
                )}
              <View style={styles.storyContainer}>
                {this.state.stories.map((story)=> {return <Card
                        title={story.title}
                        // image={{ uri: review.imageUrl }}
                        containerStyle={styles.storyCard}
                      >
                        <Text style={{ marginBottom: 10, textAlign: 'center' }}>{story.story}</Text>
                </Card>})}
              </View>
            </View>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  location: {
    paddingTop: 30,
    paddingBottom: 20,
  },
  textInput: {
    width: Dimensions.get("window").width - 50,
    height: 100
  },
  addButton: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#56b1bf",
    borderRadius: 100,
    width: 65,
    height: 65,
  },
  addBtnPosition: {
    position: "absolute", 
    bottom: 20, 
    right: 20,
  },
  button: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#56b1bf",
    // width: "100%",
    // height: 50,
    borderWidth: 0,
    borderRadius: 5,
    marginTop: 10,
    paddingLeft: 50,
    paddingRight: 50
    // marginBottom: 10
  },
  detailImage: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height / 3,
    margin: 2
  },

  detailTitle: {
    margin: 1,
    fontSize: 25,
    textAlign: "center",
    color: "#898989",
    fontWeight: "bold"
  },

  detailText: {
    width: Dimensions.get("window").width - 20,
    fontSize: 20,
    textAlign: "center",
    color: "#898989"
  },

  container: {
    // flex: 1,
    width: 140, height: 60,
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: "#fff"
  },
  map: {
    ...StyleSheet.absoluteFillObject
  },
  centerPin: {    
    zIndex: 3,
    position: 'absolute',
    marginTop: -37,
    marginLeft: -11,
    left: "50%",
    top: "50%",
  },
  currentLocation: {
    borderRadius: 100,
    backgroundColor: "#339EFF",
    padding: 8,
    borderWidth: 3,
    borderColor: "#FFF"
  },
  storyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  storyCard: {
    width: 150,
    height: 120,
    borderRadius: 20,
  },
  marker: {
    backgroundColor: "#550bbc",
    padding: 5,
    borderRadius: 100,
  },
  callout: {
    flex: 1, 
    position: 'relative', 
    height: 150,
    borderRadius: 100,
  },
  title: {
    fontSize: 12,
  },
  addBtnText: {
    fontSize: 25,
    color: 'white'
  },
  description: {
    marginLeft: 3,
    marginRight: 3,
    fontSize: 10,
  }
});

const MapScreen = createStackNavigator({
  Main: { screen: Main },
  Location: { screen: Location },
  AddLocation: { screen: AddLocation }
}, {
  initialRouteName: 'Main', 
  defaultNavigationOptions: {
    header: null,
  },
  mode: 'modal',
  headerMode: 'none',
  backBehavior: 'initialRoute'
});
export default MapScreen;