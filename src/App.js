import React from 'react';
import Files from './Files';
import Contact from './Contact';
import './App.css';
import { Layout } from 'antd';
import "antd/dist/antd.css";
const { Header, Footer, Sider, Content } = Layout


function App() {
  return (
    <Layout>
      <Sider width='40%' theme = 'light'>
        <Contact />
      </Sider>
      <Layout>
        <Content>
          <Files />
        </Content>
      </Layout>
    </Layout>
  );
}
export default App;
