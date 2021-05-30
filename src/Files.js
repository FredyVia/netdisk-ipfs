import React from 'react';
import { DownOutlined } from '@ant-design/icons';
const { ipcRenderer } = window.require('electron')
import { Button, Tree, TreeSelect, Typography } from 'antd';
const { DirectoryTree } = Tree
class UploadPart extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      uploadMessages: {
        status: "info",
        message: "选择上方目标路径文件夹，再上传文件"
      }
    };
    ipcRenderer.on('openDialog-response', (event, arg) => {
      console.log(arg); // prints "pong"
      let alertMessage = arg.split('|');
      this.setState({
        uploadMessages: {
          status: alertMessage[0],
          message: alertMessage[1],
        }
      })
    });
  }
  componentWillUnmount() {
    ipcRenderer.removeAllListeners('openDialog-response');
  }
  render() {
    return (
      <div>
        <TreeSelect
          showSearch
          style={{ width: 300 }}
          placeholder="Please choose upload destination"
          allowClear
          defaultValue='/'
          treeDefaultExpandAll
          onChange={(newDest) => {
            this.uploadFolder = newDest;
          }}
          treeData={this.props.treeData}>
        </TreeSelect >

        <Button type="primary" onClick={() => {
          console.log(ipcRenderer.send('openDialog-request', { folder: this.uploadFolder || '/', encypt: true }));
        }}>
          加密上传文件
        </Button>
        <Button type="primary" onClick={() => {
          console.log(ipcRenderer.send('openDialog-request', { folder: this.uploadFolder || '/', encypt: false }));
        }}>
          不加密上传文件
        </Button>
      </div>
    )
  }
}

class Files extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      files: null,
      directorys: null,
      checkedKeys: []
    }
  }
  deleteFiles() {
    ipcRenderer.send('files-delete-request');
  }
  componentWillUnmount() {
    ipcRenderer.removeAllListeners('files-list-request')
  }
  componentDidMount() {
    ipcRenderer.on('files-list-response', (event, files_str) => {
      console.log(files_str);
      let files_json = JSON.parse(files_str)
      let tmp = this.getDirecTree(files_json)
      console.log(JSON.stringify(tmp))
      let directorys = [tmp];
      console.log(JSON.stringify(directorys));
      this.setState({
        files: files_json.children,
        directorys: directorys
      })
    });
    console.log("---------------------");
    ipcRenderer.send('files-list-request');
  }
  getDirecTree(file) {
    console.log("============================")
    // console.log(file)
    if (file.isLeaf)
      return null;
    console.log(JSON.stringify(file))
    // console.log(file.key)
    // console.log(file.isLeaf)
    let file_json = { title: file.title, value: file.key }
    let directorys = [];
    console.log(file.children)
    for (const i in file.children) {
      let file_child = file.children[i];
      console.log(JSON.stringify(file_child))
      let file_child_directory = this.getDirecTree(file_child);
      console.log(file_child_directory)
      if (file_child_directory != null) {
        directorys.push(Object.assign({}, file_child_directory));
        // console.log(JSON.stringify(file_child));
        // console.log(JSON.stringify(file_child))
      }
    }
    file_json.children = directorys.slice();
    return file_json
  }
  render() {
    return (
      <div>
        <UploadPart treeData={this.state.directorys} changes={this.updateDirecTree} />
        <DirectoryTree
          multiple
          checkable
          switcherIcon={<DownOutlined />}
          defaultExpandAll
          titleRender={(nodeData) => {
            console.log(nodeData)

            return (
              <dev>
                <Typography.Text>
                  {nodeData.title}
                </Typography.Text>
                <Button type="primary" onClick={() => {
                  ipcRenderer.send('files-delete-request', nodeData.key);
                }}>删除文件</Button>
              </dev>
            )
          }}
          // onSelect={(checkedKeys, info) => {
          //   // this.checked = checkedKeys;
          // }}
          // onCheck={()=>{

          // }}
          treeData={this.state.files}
        />
      </div>
      // <div>
      //   {/* <header className="App-header">
      //     <img src={logo} className="App-logo" alt="logo" />
      //   </header> */}
      //   <UploadPart treeData={this.state.directorys} changes={this.updateDirecTree} />
      //   {/* <Button>删除</Button> */}
      //   <DirectoryTree
      //     multiple
      //     // checkable
      //     switcherIcon={<DownOutlined />}
      //     defaultExpandAll
      //     onSelect = {this.selectFiles.bind(this)}
      //     treeData={this.state.files}
      //   />
      // </div>
    );
  }
}

export default Files;
