#include <heltec.h>

#include <DHT11.h>

/* Heltec Automation LoRaWAN communication example
 *
 * Function:
 * 1. Upload node data to the server using the standard LoRaWAN protocol.
 *  
 * Description:
 * 1. Communicate using LoRaWAN protocol.
 * 
 * HelTec AutoMation, Chengdu, China
 * 成都惠利特自动化科技有限公司
 * www.heltec.org
 *
 * */

#include "LoRaWan_APP.h"
#include "Wire.h"

/* OTAA para*/
uint8_t devEui[] = { 0x70, 0xB3, 0xD5, 0x7E, 0xD0, 0x06, 0xB3, 0xDB };
uint8_t appEui[] = { 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 };
uint8_t appKey[] = { 0xBE, 0x01, 0x4F, 0x79, 0xC3, 0x93, 0xA6, 0x6D, 0x7D, 0xFA, 0xFF, 0x1B, 0x40, 0xD6, 0x59, 0xDB };

/* ABP para*/
uint8_t nwkSKey[] = { 0x15, 0xb1, 0xd0, 0xef, 0xa4, 0x63, 0xdf, 0xbe, 0x3d, 0x11, 0x18, 0x1e, 0x1e, 0xc7, 0xda,0x85 };
uint8_t appSKey[] = { 0xd7, 0x2c, 0x78, 0x75, 0x8c, 0xdc, 0xca, 0xbf, 0x55, 0xee, 0x4a, 0x77, 0x8d, 0x16, 0xef,0x67 };
uint32_t devAddr =  ( uint32_t )0x007e6ae1;

/*LoraWan channelsmask, default channels 0-7*/ 
uint16_t userChannelsMask[6]={ 0x00FF,0x0000,0x0000,0x0000,0x0000,0x0000 };

/*LoraWan region, select in arduino IDE tools*/
LoRaMacRegion_t loraWanRegion = ACTIVE_REGION;

/*LoraWan Class, Class A and Class C are supported*/
DeviceClass_t  loraWanClass = CLASS_A;

/*the application data transmission duty cycle.  value in [ms].*/
uint32_t appTxDutyCycle = 15000;

/*OTAA or ABP*/
bool overTheAirActivation = true;

/*ADR enable*/
bool loraWanAdr = true;

/* Indicates if the node is sending confirmed or unconfirmed messages */
bool isTxConfirmed = true;

/* Application port */
uint8_t appPort = 2;
/*!
* Number of trials to transmit the frame, if the LoRaMAC layer did not
* receive an acknowledgment. The MAC performs a datarate adaptation,
* according to the LoRaWAN Specification V1.0.2, chapter 18.4, according
* to the following table:
*
* Transmission nb | Data Rate
* ----------------|-----------
* 1 (first)       | DR
* 2               | DR
* 3               | max(DR-1,0)
* 4               | max(DR-1,0)
* 5               | max(DR-2,0)
* 6               | max(DR-2,0)
* 7               | max(DR-3,0)
* 8               | max(DR-3,0)
*
* Note, that if NbTrials is set to 1 or 2, the MAC will not decrease
* the datarate, in case the LoRaMAC layer did not receive an acknowledgment
*/
uint8_t confirmedNbTrials = 4;

// Define sensor pins
#define MQ2PIN 1
#define DHTPIN 2
#define FLAMESENSORPIN 3

// Initialize the DHT11 sensor
DHT11 dht(DHTPIN);


/* Prepares the payload of the frame */
static void prepareTxFrame(uint8_t port)
{
  // Read and process each sensor
  int mq2Value = readGasSensor();
  int flameProbability = calculateFlameProbability();
  int flameData = readFlameSensor();
  int temperature = 0, humidity = 0;

  if (readDHT11(temperature, humidity)) {
    // If successful, display temperature and humidity
    Serial.print("Temperature: ");
    Serial.print(temperature);
    Serial.print(" °C\tHumidity: ");
    Serial.print(humidity);
    Serial.println(" %");
  } else {
    Serial.println("Failed to read from DHT11 sensor.");
  }

  // Display other sensor data
  Serial.print("MQ2 Gas Sensor Value: ");
  Serial.println(mq2Value);

  Serial.print("Flame Probability: ");
  Serial.print(flameProbability);
  Serial.println("%");

  Serial.print("Flame Detector Analog Value: ");
  Serial.println(flameData);

  delay(4000); // Adjust delay as necessary

  // Préparation des données à envoyer via LoRa
  unsigned char *puc;
  appDataSize = 0;

  // Données de gaz
  puc = (unsigned char *)(&mq2Value);
  appData[appDataSize++] = puc[0];
  appData[appDataSize++] = puc[1];

  // Données de flame probability
  puc = (unsigned char *)(&flameProbability);
  appData[appDataSize++] = puc[0];

  // Ajout des données du capteur de flamme
  puc = (unsigned char *)(&flameData);
  appData[appDataSize++] = puc[0];
  appData[appDataSize++] = puc[1];

  // température 
  puc = (unsigned char *)(&temperature);
  appData[appDataSize++] = puc[0];

  // humidité 
  puc = (unsigned char *)(&humidity);
  appData[appDataSize++] = puc[0];

  Serial.print("Payload (Hex): ");
  for (int i = 0; i < appDataSize; i++) {
    Serial.printf("%02X ", appData[i]);
  }
  Serial.println();

  Wire.end();
}


//if true, next uplink will add MOTE_MAC_DEVICE_TIME_REQ 

void setup() {
  Serial.begin(115200);
  Mcu.begin(HELTEC_BOARD, SLOW_CLK_TPYE);
}

void loop()
{
  switch( deviceState )
  {
    case DEVICE_STATE_INIT:
    {
#if(LORAWAN_DEVEUI_AUTO)
      LoRaWAN.generateDeveuiByChipID();
#endif
      LoRaWAN.init(loraWanClass,loraWanRegion);
      //both set join DR and DR when ADR off 
      LoRaWAN.setDefaultDR(3);
      break;
    }
    case DEVICE_STATE_JOIN:
    {
      LoRaWAN.join();
      break;
    }
    case DEVICE_STATE_SEND:
    {
      prepareTxFrame( appPort );
      LoRaWAN.send();
      deviceState = DEVICE_STATE_CYCLE;
      break;
    }
    case DEVICE_STATE_CYCLE:
    {
      // Schedule next packet transmission
      txDutyCycleTime = appTxDutyCycle + randr( -APP_TX_DUTYCYCLE_RND, APP_TX_DUTYCYCLE_RND );
      LoRaWAN.cycle(txDutyCycleTime);
      deviceState = DEVICE_STATE_SLEEP;
      break;
    }
    case DEVICE_STATE_SLEEP:
    {
      LoRaWAN.sleep(loraWanClass);
      break;
    }
    default:
    {
      deviceState = DEVICE_STATE_INIT;
      break;
    }
  }
}
// Function to read gas sensor (MQ2)
int readGasSensor() {
  return analogRead(MQ2PIN);  // Return raw analog value
}

// Function to calculate flame probability
int calculateFlameProbability() {
  int flameData = readFlameSensor();
  return 100 * (1 - ((flameData + 1) / 4096.0));  // Probability as a percentage
}

// Function to read flame sensor
int readFlameSensor() {
  return analogRead(FLAMESENSORPIN);  // Return raw analog value
}


// Function to read DHT11 sensor (returns success/failure)
bool readDHT11(int &temperature, int &humidity) {
  int result = dht.readTemperatureHumidity(temperature, humidity);
  return (result == 0);  // Return true if successful, false otherwise
}