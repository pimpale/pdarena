import { Container, Button } from 'react-bootstrap';

import ExternalLayout from '../components/ExternalLayout';
import { Section, BrandedComponentProps } from '@innexgo/common-react-components';

import atlasIcon from '../img/atlas_icon_light.png';

function Home(props: BrandedComponentProps) {

  const jumboStyle = {
    height: "80vh",
    alignItems: "center",
    backgroundAttachment: "fixed",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
    display: "flex",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    marginTop: "25px"
  };


  const buttonStyle = {
    backgroundColor: "#9DC6E1",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "5px",
    width: "33vh",
    fontSize: "20px",
    fontWeight: "bolder" as "bolder",
    letterSpacing: "1px",
    marginLeft: "10px"
  };

  const gradText = {
    background: "linear-gradient(#9DC6E1, #CBC0AC)",
    color: "transparent",
    backgroundClip: "text",
    webkitBackgroundClip: "text",
    fontWeight: "bold" as "bold",
    letterSpacing: "1px",
    marginBottom: "20px",
    fontSize: "45px"
  };

  const bodyText = {
    marginBottom: "25px",
    lineHeight: "25px",
  };

  const homeTextStyle = {
    marginLeft: "150px"
  };

  const goldBack = {
    backgroundColor: "#F6F0E5"
  };
  const homeBody = {
    height: "50vh",
    marginTop: "110px"
  };

  return (
    <ExternalLayout branding={props.branding} fixed={true} transparentTop={true}>
      <>
        <Container fluid style={jumboStyle}>

          <img src={atlasIcon} width="450" />

          <div style={homeTextStyle}>
            <h1 style={gradText}>{props.branding.tagline}</h1>
            <h5 style={bodyText}>
              Use Python to determine whether or not to defect in a repeated
              prisoner's dilemma situation.
            </h5>
            <Button style={buttonStyle} href="/dashboard">Get Started → </Button>
          </div>
        </Container>

        <div className="w-100">
          <svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,
            11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z" className="shape-fill" fill="#F6F0E5"></path>
          </svg>
        </div>

        <div style={goldBack}>

          <Container style={{ paddingBottom: '30px' }}>
            <Section id="welcome" name={`Welcome to ${props.branding.name}`} >
              <div style={{ paddingBottom: '20px' }}>
                Prisoner's Dilemma!
              </div>
            </Section>
          </Container>
        </div>
      </>
    </ExternalLayout>
  )
}

export default Home;
