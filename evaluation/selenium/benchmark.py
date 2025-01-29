from selenium import webdriver
import time

from selenium.common import TimeoutException
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By

# Pfad zur Firefox-Erweiterung (.xpi-Datei)

# The extension in its production ready form
erweiterung_unknown = './17840039dd4943e1851d-1.4.1.xpi'

# The extension manipulated to already trust the visited website
erweiterung_known = './17840039dd4943e1851d-1.4.2.xpi'

# firefox_profile_path = '../../firefox-profile'
firefox_profile_path = './firefox-profile'
# URL der zu testenden Webseite
url = 'https://i4epyc1.cs.fau.de'
# waiting condition to detect the main site
# waiting_condition = EC.presence_of_element_located((By.ID, 'test123'))
waiting_condition = EC.title_is("bRAwser")

# Set the path to your custom Firefox binary
custom_firefox_path = "/Users/luca/Dev/Firefox/obj-aarch64-apple-darwin24.0.0/dist/Nightly.app/Contents/MacOS/firefox"

testcases = ["unknown", "known", "raw",
             "raw_reload_no_cash", "known_reload_no_cash"]

# options.add_argument("--headless")

# options.set_preference("profile", firefox_profile_path)
# options.profile = firefox_profile_path
# options.add_argument("-profile firefox_profile_path")

def get_options(testcase):
    options = webdriver.FirefoxOptions()
    options.binary_location = custom_firefox_path
    options.add_argument("--headless")    # run in headless mode without UI
    # options.profile = profile_path        # Set profile to start with

    if testcase.__contains__("no_cash"):
        print("setting up no cash")
        options.set_preference("browser.cache.disk.enable", False)  # Disable disk cache
        options.set_preference("browser.cache.memory.enable", False)  # Disable memory cache
        options.set_preference("browser.cache.offline.enable", False)  # Disable offline cache
        options.set_preference("network.http.use-cache", False)  # Disable HTTP cache

    return options

running_driver = None
def get_driver(testcase):
    if running_driver is None:
        driver = webdriver.Firefox(options=get_options(testcase))
    elif testcase.__contains__("reload"):
        driver = running_driver
    else:
        driver = webdriver.Firefox(options=get_options(testcase))

    if testcase == "unknown":
        driver.install_addon(erweiterung_unknown, temporary=True)
        # time.sleep(2)
    elif testcase == "known":
        driver.install_addon(erweiterung_known, temporary=True)
        # time.sleep(2)

    return driver

# Anzahl der Wiederholungen
anzahl_wiederholungen = 100

# Liste zur Speicherung der Ladezeiten
ladezeiten = {}

# Starte den Testschleife
for testcase in testcases:
    ladezeiten[testcase] = []
    print(f'testing: {testcase}')

    wiederholung = 0
    reload_warmup = True
    while wiederholung < anzahl_wiederholungen:
        try:
            # if wiederholung % (anzahl_wiederholungen / 10) == 0:
            print(f'Wiederholung {wiederholung} von {anzahl_wiederholungen}')

            running_driver = get_driver(testcase)
            wait = WebDriverWait(running_driver, timeout=5, poll_frequency=1/1000)

            # be sure the browser was already open before starting the measurement
            # driver.get("https://example.com")
            # TODO Schlafen sinnvoll?
            time.sleep(2)

            # Navigiere zur Webseite
            startzeit = time.time()  # Startzeit messen
            running_driver.get(url)

            if testcase == "unknown" or testcase == "unknown_no_freshness":
                # click the trust button
                button = wait.until(EC.element_to_be_clickable((By.ID, "trust-measurement-button")))
                button.click()

            # if testcase == "unknown":
            wait.until(waiting_condition)
            endzeit = time.time()  # Endzeit messen

            ladezeit = (endzeit - startzeit) * 1000  # Ladezeit berechnen
            if not testcase.__contains__("reload") or not reload_warmup:
                ladezeiten[testcase].append(ladezeit)
                wiederholung += 1
            else:
                reload_warmup = False

        except TimeoutException as e:
            print("Timeout exception" + e.msg)
            continue
        except Exception as e:
            print("Exception" + str(e))
            continue
        finally:
            # clean up for next run
            if running_driver and not testcase.__contains__("reload") or wiederholung == anzahl_wiederholungen:
                running_driver.quit()
                running_driver = None

        # Nicht mehr nötig, da Browser neu gestartet wird
        # driver.delete_all_cookies()
        # driver.execute_script('window.localStorage.clear();')

for testcase in testcases:
    # Berechne Durchschnittliche Ladezeit
    durchschnittliche_ladezeit = sum(ladezeiten[testcase]) / len(ladezeiten[testcase])

    # Gib die Ergebnisse aus
    print(f'Testcase: {testcase}')
    print(f'Durchschnittliche Ladezeit nach {anzahl_wiederholungen} Versuchen: {durchschnittliche_ladezeit} ms')
    print(f'Lowest: {min(ladezeiten[testcase])}, highest: {max(ladezeiten[testcase])}')
    # print(str(ladezeiten[testcase]))
    print()

for testcase in testcases:
    print(f'Testcase: {testcase}')
    print(str(ladezeiten[testcase]))
    print()
