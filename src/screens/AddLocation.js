import React from "react";
import { TEXT_COLOR } from "../constants/Colors";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TextInput,
  Image,
  Alert,
  TouchableOpacity,
  Modal,
  Picker,
  KeyboardAvoidingView,
  ToastAndroid,
} from "react-native";
import { Button, Icon, FormInput } from "react-native-elements";
import MapView, { PROVIDER_GOOGLE, Marker, Callout } from "react-native-maps";
import { DEFAULT_MAP, ADD_LOCATION } from "../constants/MapLayout";

import CustomMarker from "../components/CustomMarker.js";
import firestore from "../utils/firestore";
import firebase from "../utils/firebaseClient";
import { NavigationActions } from "react-navigation";
import { ScrollView } from "react-native-gesture-handler";

import { uploadImage, pickImage } from "../utils/imageUtils.js";

export default class AddLocation extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      region: {
        latitude: this.props.navigation.state.params.region.latitude,
        longitude: this.props.navigation.state.params.region.longitude,
        latitudeDelta: this.props.navigation.state.params.region.latitudeDelta,
        longitudeDelta: this.props.navigation.state.params.region
          .longitudeDelta,
      },
      markers: this.props.navigation.state.params.markers,
      modalVisible: false,
      categories: [
        "Entertainment",
        "Attractions",
        "Shopping",
        "Restaurants",
        "Nightlife",
        "Information",
        "Events",
        "Transportation",
      ],
      selectedCategory: undefined,
      newLocationTitle: undefined,
      newLocationDescription: undefined,
      newLocationImageURI: null,
      newLocationImageURL: null,
    };

    this.isFirstLaunch = true;
    this.onRegionChange = this.onRegionChange.bind(this);
    this.backToMap = this.backToMap.bind(this);
    this.renderMarkers = this.renderMarkers.bind(this);
    this.imageDialog = this.imageDialog.bind(this);
    this.addURL = this.addURL.bind(this);
  }

  componentDidMount() {
    if (this.isFirstLaunch) {
      ToastAndroid.showWithGravityAndOffset(
        "Move the map to position the pin at the location you wish to add.",
        ToastAndroid.LONG,
        ToastAndroid.CENTER,
        0,
        20
      );
      this.isFirstLaunch = false;
    }
  }

  saveNewLocation() {
    if (
      !this.state.newLocationTitle ||
      !this.state.selectedCategory ||
      !this.state.newLocationDescription ||
      !this.state.newLocationImageURI
    ) {
      Alert.alert(
        "Missing some field(s)!",
        "Please make sure to fill everything out.",
        [{ text: "OK", onPress: () => console.log("OK Pressed") }]
      );
    } else {
      const latitude = this.state.region.latitude;
      const longitude = this.state.region.longitude;
      const newLocation = {
        key: this.state.markers.length,
        category: this.state.selectedCategory,
        coordinate: { latitude, longitude },
        latitude,
        longitude,
        description: this.state.newLocationDescription,
        title: this.state.newLocationTitle,
      };
      // add a new doc in the locations table of the DB
      firestore
        .collection("locations")
        .add(newLocation)
        .then((docRef) => {
          console.log("Location Created successfully, ID=>", docRef.id);
          // If an image is provided
          if (this.state.newLocationImageURI) {
            // upload the image on the firebase storage
            uploadImage(
              this.state.newLocationImageURI,
              "/locations/",
              docRef.id
            )
              .then((snapshot) => {
                // when upload successfull get the DownloadURL
                console.log("Image Uploaded Succesfully");
                snapshot.ref.getDownloadURL().then((downloadURL) => {
                  console.log("Image Available at: ", downloadURL);
                  // update the newLocation document with the url of the photo
                  this.addURL(downloadURL, docRef.id);
                  newLocation.image = downloadURL;
                  this.setState({
                    // markers: [...this.state.markers, newLocation],
                    modalVisible: false,
                    selectedCategory: undefined,
                    newLocationDescription: undefined,
                    newLocationTitle: undefined,
                    newLocationImage: undefined,
                  });
                  this.backToMap(newLocation);
                });
              })
              .catch((e) => {
                console.log(e);
                return null;
              });
          } else {
            this.setState({
              modalVisible: false,
              selectedCategory: undefined,
              newLocationDescription: undefined,
              newLocationTitle: undefined,
              newLocationImage: undefined,
            });
            this.backToMap();
          }
        })
        .catch((e) => {
          console.log(e);
          return null;
        });
    }
  }

  onRegionChange(region) {
    this.setState({ region });
  }

  renderMarkers() {
    const region = this.state.region;
    const min = {
      latitude: region.latitude - region.latitudeDelta / 1.5,
      longitude: region.longitude - region.longitudeDelta / 1.5,
    };
    const max = {
      latitude: region.latitude + region.latitudeDelta / 1.5,
      longitude: region.longitude + region.longitudeDelta / 1.5,
    };
    const visibleMarkers = [];
    const markers = this.state.markers.map((marker, index) => {
      marker.isVisible = false;
      if (marker.latitude <= max.latitude && marker.latitude >= min.latitude) {
        if (
          marker.longitude <= max.longitude &&
          marker.longitude >= min.longitude
        ) {
          marker.isVisible = true;
          visibleMarkers.push(marker);
        }
      }
      return marker;
    });
    console.log(
      "VISIBLE MARKERS",
      visibleMarkers.map((marker) => marker.title)
    );
    this.setState({ markers });
  }

  backToMap(newLocation) {
    let markers = this.state.markers;
    if (newLocation) {
      markers = [...this.state.markers, newLocation];
    }
    this.props.navigation.state.params.onNavigateBack(
      this.state.region,
      markers
    );
    const navigateAction = NavigationActions.navigate({
      routeName: "Main",
    });
    this.props.navigation.dispatch(navigateAction);
  }

  addURL = (url, locationID, newLocation) => {
    console.log("Update the url of the picture for location on the DB.");
    firestore
      .collection("locations")
      .doc(locationID)
      .update({ image: url })
      .then(() => {
        console.log("Update Successful");
      })
      .catch((e) => {
        console.log(e);
      });
  };

  imageDialog = (path, imgName) => {
    Alert.alert(
      "Upload an Image with your story",
      "Pick a method:",
      [
        {
          text: "Select from Gallery",
          onPress: () => {
            pickImage()
              .then((picker) => {
                if (!picker.cancelled) {
                  console.log("Here is your URI:", picker.uri);
                  this.setState({
                    newLocationImageURI: picker.uri,
                  });
                }
              })
              .catch((e) => {
                console.log(e);
                return null;
              });
          },
        },
        {
          text: "Take a picture",
          onPress: () => {
            takePhoto()
              .then((picker) => {
                if (!picker.cancelled) {
                  console.log("Here is your URI:", picker.uri);
                  this.setState({
                    newLocationImageURI: picker.uri,
                  });
                }
              })
              .catch((e) => {
                console.log(e);
                return null;
              });
          },
        },
      ],
      { cancelable: true }
    );
  };

  render() {
    return (
      <View style={styles.map}>
        <Modal // DISPLAY NEW LOCATION FORM
          // animationType="slide"
          transparent={false}
          visible={this.state.modalVisible}
          onRequestClose={() => this.setState({ modalVisible: false })}
        >
          <KeyboardAvoidingView
            style={styles.container}
            behavior="padding"
            enabled
          >
            <ScrollView style={styles.container}>
              <View style={styles.modalContainer}>
                <Text style={styles.detailTitle}>Adding Location</Text>
                <TextInput
                  style={styles.storytitle}
                  inputStyle={styles.inputContainer}
                  underlineColorAndroid="transparent"
                  placeholder="Location Name"
                  onChangeText={(text) =>
                    this.setState({ newLocationTitle: text })
                  }
                />
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={this.state.selectedCategory}
                    onValueChange={(itemValue, itemIndex) =>
                      this.setState({ selectedCategory: itemValue })
                    }
                  >
                    <Picker.Item
                      key={-1}
                      label="  Click here to Select a Category"
                      value={undefined}
                    />
                    {this.state.categories.map((category, index) => (
                      <Picker.Item
                        key={index}
                        label={category}
                        value={category}
                      />
                    ))}
                  </Picker>
                </View>
                <TextInput
                  style={styles.textarea}
                  multiline={true}
                  numberOfLines={5}
                  underlineColorAndroid="transparent"
                  placeholder="Description about the location"
                  onChangeText={(text) =>
                    this.setState({ newLocationDescription: text })
                  }
                />

                <View>
                  {this.state.newLocationImageURI ? (
                    <TouchableOpacity
                      onPress={() => {
                        this.imageDialog();
                      }}
                    >
                      <Image
                        style={styles.imgStory}
                        source={{ uri: this.state.newLocationImageURI }}
                      />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.cameraButton}>
                      <Icon
                        style={{ marginRight: 20 }}
                        reverse
                        name="camera"
                        type="font-awesome"
                        color="#442C2E"
                        onPress={() => {
                          this.imageDialog();
                        }}
                      />
                      <Text style={styles.textList}>No image</Text>
                    </View>
                  )}
                </View>
                <Button
                  buttonStyle={styles.button}
                  title="Save location"
                  onPress={() => {
                    this.saveNewLocation();
                  }}
                />

                <View style={styles.backBtn}>
                  <Icon
                    name="md-arrow-back"
                    onPress={() => {
                      this.setState({
                        modalVisible: false,
                      });
                    }}
                    type="ionicon"
                    size={30}
                    color={TEXT_COLOR}
                  />
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>

        <MapView // DISPLAY MAP WITH UNIQUE CENTER MARKER
          ref={(MapView) => (this.MapView = MapView)}
          region={this.state.region}
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
            if (marker.isVisible) {
              index++;
              return (
                <CustomMarker
                  key={index}
                  isVisible={true}
                  id={index}
                  marker={marker}
                  onMarkerPress={this.onMarkerPress}
                />
              );
            }
          })}
        </MapView>

        <View style={styles.addBtnPosition}>
          <TouchableOpacity
            style={styles.circleButton}
            onPress={() => this.setState({ modalVisible: true })}
          >
            <Text style={styles.addBtnText}>✓</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.xBtnPosition}>
          <TouchableOpacity
            style={styles.circleButton}
            onPress={() => this.backToMap()}
          >
            <Text style={styles.addBtnText}>x</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.centerPin}>
          <Icon name="md-pin" type="ionicon" size={40} color="#f00" />
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "white",
    color: "#56b1bf",
  },
  cameraButton: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    margin: 5,
    // justifyContent: "",
  },
  modalContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  imgStory: {
    marginTop: 10,
    width: 200,
    height: 150,
  },
  textList: {
    fontWeight: "bold",
    color: "#442C2E",
  },
  textarea: {
    height: 100,
    borderColor: "#442C2E",
    width: Dimensions.get("window").width - 40,
    marginTop: 10,
    paddingTop: 10,
    paddingBottom: 10,
    borderWidth: 1.5,
    paddingLeft: 8,
    borderRadius: 8,
    textAlignVertical: "top",
  },
  storytitle: {
    width: Dimensions.get("window").width - 40,
    marginTop: 10,
    paddingTop: 10,
    borderColor: "#442C2E",
    paddingBottom: 10,
    borderWidth: 1.5,
    paddingLeft: 8,
    borderRadius: 8,
  },
  inputContainer: {
    marginLeft: 15,
    color: "#242124",
  },
  button: {
    backgroundColor: "#56b1bf",
    borderWidth: 0,
    borderRadius: 5,
    marginTop: 20,
    paddingLeft: 50,
    paddingRight: 50,
    marginBottom: 10,
  },
  pickerContainer: {
    width: Dimensions.get("window").width - 40,
    borderWidth: 1.5,
    borderColor: "#442C2E",
    borderRadius: 5,
    marginTop: 10,
  },
  imgLocation: {
    marginTop: 20,
    width: 300,
    height: 200,
  },
  circleButton: {
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
  xBtnPosition: {
    zIndex: 3,
    position: "absolute",
    bottom: 20,
    left: 20,
  },
  detailImage: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height / 3,
    margin: 2,
  },
  detailTitle: {
    margin: 1,
    fontSize: 25,
    textAlign: "center",
    color: "#442C2E",
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 5,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  centerPin: {
    zIndex: 3,
    position: "absolute",
    marginTop: -37,
    marginLeft: -11,
    left: "50%",
    top: "50%",
  },
  callout: {
    flex: 1,
    position: "relative",
    height: 150,
    borderRadius: 100,
  },
  title: {
    fontSize: 12,
  },
  addBtnText: {
    fontSize: 25,
    color: "white",
  },
  backBtn: {
    marginTop: 10,
    position: "absolute",
    top: 0,
    left: 20,
    marginBottom: 8,
  },
  description: {
    marginLeft: 3,
    marginRight: 3,
    fontSize: 10,
  },
});
