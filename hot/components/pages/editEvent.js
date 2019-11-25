import React, { Component } from 'react';
import { View, StyleSheet, Text, TouchableHighlight, ScrollView} from 'react-native';
import t from 'tcomb-form-native';
import Event, { get_loc_from_addr } from '../classes/event.js'
import Geocoder from 'react-native-geocoding';
import {
  Alert,
} from 'react-native';

export const BASE_URL = 'https://hot-backend.herokuapp.com'
export const fetch_headers = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
}

/* Create Form Structure for the form builder library*/
const Form = t.form.Form;

const event = t.struct({
  name: t.String,
  desc: t.String,
  addr: t.String,
  start_date: t.Date,
  end_date: t.Date,
  tags: t.maybe(t.String),
  admins: t.maybe(t.String)
});

/* Set Form Placeholders and input validation settings */
const currTime = new Date()
var options = {
  fields: {
    name: {
      label: 'Event Name',
      maxLength: 128,
      value: 'what to heck'
    },
    desc: {
      label: 'Event Description',
      maxLength: 1000,
      multiline: true
    },
    addr: {
      label: 'Address',
      maxLength: 500,
      multiline: true,
      numberOfLines: 2
    },
    start_date: {
      initialDate: currTime,
      minimumDate: currTime,
      minuteInterval: 10,
    },
    end_date: {
      minimumDate: currTime,
      minuteInterval: 10,
    },
    tags: {
    },
    admins: {
    }
  }
};

function add_event_to_database(event,cb){
  fetch(`${BASE_URL}/events`, {
    method: 'POST',
    headers: fetch_headers,
    body: JSON.stringify(event)
  })
  .then((response) => response.text())
  .then((responseVal) => {
    cb(responseVal)
  })
  .catch((error) => {
    cb(0)
  });   
}

// this fn will be used to turn tags/admins lists back into a string in order to display it in the edit form
function list_str(input_list) {
    ret = ""
    for (x in input_list) {
        console.log(input_list)
        console.log(x)
        ret += input_list[x]
        ret += ", "
    }
    if (input_list.length > 0) {
        ret = ret.slice(0, -2)
    }
    return ret
}

function parse_tags(tag_str){
  x = new Set()
  if (tag_str != null && tag_str != "") {
      tagArray = tag_str.split(/[ ,]+/)
      for (var tag of tagArray) {
          x.add(tag.toLowerCase()) /* TODO: make these sets instead of arrays */
      }
  }
  return Array.from(x)
}

function parse_admins(admin_str, username){
  x = new Set()
  x.add(username)
  if (admin_str != null && admin_str != "") {
      adArray = admin_str.split(/[ ,]+/)
      for (var ad of adArray) {
          x.add(ad.toLowerCase()) /* TODO: make these sets instead of arrays */
      }
  }
  return Array.from(x)
}

export default class EditEvent extends React.Component {
  constructor(props){
    super(props)
    this.onPress = this.onPress.bind(this);
  }

    /* onForm Submit function */
  onPress = (usr) => {
    var value = this.refs.form.getValue();
    if (value) { 
      var validEvent = new Event(null, 
                            value.name,
                            value.desc,
                            new Date(value.start_date),
                            new Date(value.end_date),
                            value.addr,
                            parse_tags(value.tags),
                            parse_admins(value.admins, usr.getUserName()))
      
      if (!validEvent.is_null_event()) {
        // Address Validity - Get latitude longitude points
        get_loc_from_addr(value.addr, validEvent, (loc) => {
          // Loc is valid
          if (loc != null) {
            add_event_to_database(validEvent, (resp) => {
              if (resp != 0) {
                validEvent.set_eventID(resp)
                console.log(`switched to events screen for ${resp}`)
                this.props.navigation.navigate('Event', {evt: validEvent, usr: usr})
              }
              else {
                Alert.alert('Server Error: Try Again Later!')
              }         
            })
          }
          // Loc is invalid
          else {
            Alert.alert('Form Error: Invalid Address')
          }
        })
      }
      else {
        // Invalid Event Object
        Alert.alert('Form Error: Invalid Start and End Date')
      }
    }
    else{
      // Invalid Form
      Alert.alert('Form Error: Missing Fields')
    }
  }

  render() {
    var saved_e = this.props.navigation.getParam('evt')
    var saved_name = saved_e.get_name()
    var saved_desc = saved_e.get_desc()
    var saved_addr = saved_e.get_address()
    var saved_start = saved_e.get_start_date()
    var saved_end = saved_e.get_end_date()
    var saved_tags = list_str(saved_e.get_tags())
    var saved_admins = list_str(saved_e.get_admins())

    console.log(({}).toString.call(saved_addr).match(/\s([a-zA-Z]+)/)[1].toLowerCase())
    console.log(({}).toString.call(saved_start).match(/\s([a-zA-Z]+)/)[1].toLowerCase())

    var value = {
        name: `${saved_name}`,
        desc: `${saved_desc}`,
        addr: `${saved_addr}`,
        tags: `${saved_tags}`,
        admins: `${saved_admins}`,
    }

    return (
      <View style={styles.container}>
        <ScrollView>
        <Form
          ref="form"
          type={event}
          options={options}
          value = {value}
        />
        <TouchableHighlight style={styles.button} underlayColor='#99d9f4'>
          <Text style={styles.buttonText}>Create</Text>
        </TouchableHighlight>

        <Text onPress={this.onPress}>
          {this.props.formStatus}
        </Text>

        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    marginTop: 50,
    padding: 20,
    backgroundColor: '#ffffff',
  },
  buttonText: {
    fontSize: 18,
    color: 'white',
    alignSelf: 'center'
  },
  button: {
    height: 36,
    backgroundColor: '#48BBEC',
    borderColor: '#48BBEC',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
    alignSelf: 'stretch',
    justifyContent: 'center'
  }
});
